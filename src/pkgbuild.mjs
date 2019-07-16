import { promisify } from "util";
import { finished } from "stream";
import { quote } from "./util.mjs";

export async function pkgbuild(context, stagingDir, out, options = {}) {
  const pkg = { contributors: [], pacman: {}, ...context.pkg };

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

  const depends = makeDepends({ ...pkg.engines });

  const properties =
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
    md5sums,
    ...pkg.pacman,
    depends
  };

  if (properties.install !== undefined || properties.hooks !== undefined) {
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
  sed -i 's/"version": ".*/"version": "${
    context.properties.pkgver
    }",/' package.json
  npm install
  npm pack
  npm prune --production
  rm -rf node_modules/.bin
  #arch=$(file -b  $(which node)|cut -d',' -f2)
  find . -name "*.node"|xargs -r file|grep -v ELF|sed 's/:.*//'|xargs -r rm
  ${cleanup.map(c => findAndDelete(c.pattern, c.dir, c.options)).join("\n")}
}

package() {
  depends=(${makeDepends(pkg.pacman.depends)
      .map(a => `"${a}"`)
      .join(" ")})

  mkdir -p \${pkgdir}${installdir}
  ${npmDistPackage}
  ${npmModulesPackage}
  npx npm-pkgbuild --package \${srcdir}/\${pkgname}${directory} --staging \${pkgdir} cleanup content systemd
}
`
  );

  out.end();

  await promisify(finished);
}

const cleanup = [
  {
    options: { filesOnly: true, ignoreCase: true },
    pattern: ["LICENSE*", "LICENCE*", 'COPYING']
  },
  {
    options: { filesOnly: true },
    pattern: [".git*"]
  },
  {
    options: { filesOnly: true },
    pattern: [
      "*~",
      "*.bak",
      "*.mk",
      "*.bat",
      "*.tmp",
      "*.orig",
      "*.d.ts*",
      "*.mjs.map",
      "*.js.map",
      "*.min.map",
      "*.1",
      "*.patch",
      "*.cc",
      "*.c",
      "*.h",
      "*.h.in",
      "*.cmake",
      "*.gyp",
      ".jshintrc*",
      ".esl*",
      ".zuul.yml",
      ".doclets.yml",
      ".editorconfig",
      ".tern-project",
      ".dockerignore",
      ".dir-locals.el",
      ".travis.yml",
      "appveyor.yml",
      "yarn.lock",
      "rollup.config.*",
      "gulpfile.js",
      "jsdoc.json",
      "Gruntfile.js",
      "karma.conf.js",
      "verb.md",
      ".nvmrc",
      "config.gypi",
      "bower.json",
      "*.bash_completion.*",
      ".coveralls.yml",
      ".istanbul.yml",
      ".babelrc.*",
      ".nycrc",
      ".DS_Store",
      ".npm*",
      ".env",
      "x-package.json5",
      "component.json",
      "tsconfig.json",
      ".airtap.yml",
      ".jscs.json"
    ]
  },
  {
    options: { ignoreCase: true },
    pattern: [
      "*Makefile*",
      "CONTRIBUTING*",
      "Contributors*",
      "CHANGES*",
      "readme*",
      "AUTHORS*",
      "NOTICE*",
      "HISTORY*",
      "SUMMARY.md",
      "MIGRAT*.md",
      "UPGRAD*.md",
      "PULL_REQUEST_TEMPLATE.md",
      "PATTERNS.md",
      "REFERENCE.md",
      "SECURITY.md",
      "SFTPStream.md",
      "LIMITS.md",
      "GOVERNANCE.md",
      "Porting-Buffer.md",
      "chains and topics.md",
      "CODE_OF_CONDUCT*",
      "CODEOWNERS",
      "LICENSE.DOCS*"
    ]
  },
  {
    options: { ignoreCase: true, recursive: true },
    pattern: [
      "CHANGELOG*",
      "example*",
      "doc",
      "docs",
      "test",
      "tests",
      "uritemplate-test",
      ".github",
      "demo",
      "coverage"
    ]
  },
  {
    dir: "node_modules",
    options: { ignoreCase: true, recursive: true },
    pattern: [
      "build"
    ]
  }
];

function findAndDelete(
  pattern,
  dir = ".",
  options = { ignoreCase: false, recursive: false }
) {
  return (
    "find " +
    dir +
    " \\(" +
    pattern
      .map(p => ` ${options.ignoreCase ? "-iname" : "-name"} "${p}"`)
      .join(" -o") +
    (options.filesOnly ? " -type f" : "") +
    ` \\) -print0\\
    | xargs -r -0 ${options.recursive ? "rm -rf" : "rm"}`
  );
}

function makeDepends(d) {
  return Object.keys(d).reduce((a, c) => {
    const mapping = {
      node: "nodejs"
    };

    a.push(`${mapping[c] ? mapping[c] : c}${d[c].replace(/\-([\w\d]+)$/, "")}`);
    return a;
  }, []);
}
