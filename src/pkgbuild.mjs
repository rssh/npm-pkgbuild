import { join } from "path";
import { promisify } from "util";
import { finished } from "stream";
import { quote } from "./util.mjs";

export async function pkgbuild(context, stagingDir, out, options = {}) {
  const pkg = Object.assign({ contributors: [], pacman: {} }, context.pkg);

  /*
  if (pkg.contributors === undefined) {
    pkg.contributors = [];
  }
*/

  let md5sums;
  let source;
  let directory = "";

  if (pkg.repository) {
    source = pkg.repository.url;
    if (!source.startsWith("git+")) {
      source = "git+" + source;
    }

    md5sums = "SKIP";

    directory = pkg.repository.directory ? "/" + pkg.repository.directory : "";
  }

  let depends = Object.assign({}, pkg.pacman.depends, pkg.engines);

  depends = Object.keys(depends).reduce((a, c) => {
    const mapping = {
      node: "nodejs"
    };

    a.push(`${mapping[c] ? mapping[c] : c}${depends[c]}`);
    return a;
  }, []);

  const properties = Object.assign(
    {
      url: pkg.homepage,
      pkgdesc: pkg.description,
      license: pkg.license,
      pkgrel: context.properties.pkgrel,
      pkgver: context.properties.pkgver.replace(/\-.*$/, ""),
      pkgname: pkg.name,
      arch: "any",
      makedepends: "git",
      source,
      md5sums
    },
    pkg.pacman,
    {
      depends
    }
  );

  if (properties.install !== undefined) {
    properties.install = `${pkg.name}.install`;
  }

  const installdir = context.properties.installdir;

  delete properties.content;

  [
    "pkgname",
    "license",
    "source",
    "validpgpkeys",
    "noextract",
    "md5sums",
    "sha1sums",
    "sha256sums",
    "sha384sums",
    "sha512sums",
    "groups",
    "arch",
    "backup",
    "depends",
    "makedepends",
    "checkdepends",
    "optdepends",
    "conflicts",
    "provides",
    "replaces",
    "options"
  ].forEach(k => {
    const v = properties[k];
    if (v !== undefined && !Array.isArray(v)) {
      properties[k] = [v];
    }
  });

  let pkgver = "";

  if (context.properties.pkgver === "0.0.0-semantic-release") {
    pkgver = `
pkgver() {
  cd "$pkgname"
  printf "r%s.%s" "$(git rev-list --count HEAD)" "$(git rev-parse --short HEAD)"
}
`;
  }

  const npmDistPackage = options.npmDist
    ? `( cd \${pkgdir}${installdir}
    tar -x --transform="s/^package\\///" -f \${srcdir}/\${pkgname}${directory}/${
        pkg.name
      }-${context.properties.pkgver}.tgz)`
    : "";

  const npmModulesPackage = options.npmModules
    ? `( cd \${srcdir}/\${pkgname}${directory}
    tar cf - node_modules)|(cd \${pkgdir}${installdir};tar xf - )`
    : "";

  out.write(
    `# ${pkg.contributors
      .map(
        (c, i) => `${i ? "Contributor" : "Maintainer"}: ${c.name} <${c.email}>`
      )
      .join("\n# ")}
${Object.keys(properties)
      .filter(k => properties[k] !== undefined)
      .map(k => `${k}=${quote(properties[k])}`)
      .join("\n")}
${pkgver}
build() {
  cd \${pkgname}${directory}
  sed -i 's/"version": ".*/"version": "${context.properties.pkgver}",/' package.json
  npm install
  npm pack
  npm prune --production
  rm -rf node_modules/.bin
  find . \\( -name "*~" -o -name "*.mk" -o -name "*.bat" -o -name "*.tmp" -o -name "*.orig" \\) -print0 \\
  | xargs -r -0 rm
  find node_modules -name "*.d.ts" -print0|xargs -r -0 rm
  find node_modules -name "*.1" -print0|xargs -r -0 rm
  find node_modules -name "*.patch" -print0|xargs -r -0 rm
  find node_modules \\( -iname "example*" -o -iname doc -o -iname docs -o -iname test -o -iname tests -type d \\) -print0|xargs -r -0 rm -rf
  find node_modules \\( -iname "readme*" -o -iname "AUTHORS*" -o -iname "NOTICE*" -o -iname "HISTORY*" -o -iname SUMMARY.md -o -iname PULL_REQUEST_TEMPLATE.md \\) -print0|xargs -r -0 rm
  find node_modules -iname "CONTRIBUTING*" -print0|xargs -r -0 rm
  find node_modules -iname "Contributors*" -print0|xargs -r -0 rm
  find node_modules -iname "CHANGES*" -print0|xargs -r -0 rm
  find node_modules -iname "CHANGELOG*" -print0|xargs -r -0 rm -rf
  find node_modules -iname "*Makefile*" -print0|xargs -r -0 rm
  find node_modules -name "*.bash_completion.*" -print0|xargs -r -0 rm
  find . \\( -name yarn.lock -o -name "rollup.config.*" -o -name jsdoc.json -o -name Gruntfile.js \\) -print0|xargs -r -0 rm
  find . \\( -name MIGRATIONS.md -o -name PATTERNS.md -o -name REFERENCE.md -o -name SECURITY.md -o -name SFTPStream.md -o -name LIMITS.md -o -name GOVERNANCE.md -o -name CODE_OF_CONDUCT.md \\) -print0|xargs -r -0 rm
  find . \\( -name ".git*" -type f -o  -name ".npm*" -type f \\) -print0|xargs -r -0 rm
  find . \\( -name .verb.md -o -name .nvmrc -o -name config.gypi -o -name binding.gyp \\) -print0|xargs -r -0 rm
  find . \\( -name .travis.yml -o -name appveyor.yml \\) -print0|xargs -r -0 rm
  find . -name ".jshintrc*" -print0|xargs -r -0 rm
  find . -name ".esl*" -print0|xargs -r -0 rm
  find . -name .zuul.yml -print0|xargs -r -0 rm
  find . -name .doclets.yml -print0|xargs -r -0 rm
  find . -name .editorconfig -print0|xargs -r -0 rm
  find . -name .tern-project -print0|xargs -r -0 rm
  find . -name .dockerignore -print0|xargs -r -0 rm
  find . -name .dir-locals.el -print0|xargs -r -0 rm
}

package() {
  mkdir -p \${pkgdir}${installdir}
  ${npmDistPackage}
  npx npm-pkgbuild --package \${srcdir}/\${pkgname}${directory} --staging \${pkgdir} content systemd
  ${npmModulesPackage}
}
`
  );

  out.end();

  await promisify(finished);
}
