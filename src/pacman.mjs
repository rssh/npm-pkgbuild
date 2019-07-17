import { join } from "path";
import fs, { createReadStream } from "fs";
import execa from "execa";
import { copyTemplate } from "./util.mjs";
import { utf8StreamOptions } from "./util.mjs";

export async function pacman(context, stagingDir) {
  const pkg = context.pkg;

  if (pkg.pacman !== undefined) {
    const pacman = pkg.pacman;

    let hooks;

    if (pacman.install !== undefined) {
      console.log("pacman install is DEPRECATED use hooks instead");
      hooks = pacman.install;
    } else {
      hooks = pacman.hooks;
    }

    if (hooks !== undefined) {
      await fs.promises.mkdir(stagingDir, { recursive: true });

      await copyTemplate(
        context,
        join(context.dir, hooks),
        join(stagingDir, `${pkg.name}.install`)
      );
    }
  }
}

export async function makepkg(context, stagingDir) {
  const pkg = context.pkg;

  const srcDir = join(stagingDir, "src");
  await fs.promises.mkdir(srcDir, { recursive: true });
  await execa("ln", ["-s", "../..", join(srcDir, pkg.name)]);

  const proc = execa("makepkg", ["-f", "-e"], {
    cwd: stagingDir /*, env: { PKGDEST: publish }*/
  });

  let publish = context.properties.publish;

  //proc.all.pipe(process.stdout);

  let name, version;

  for await (const chunk of proc.all) {
    const s = chunk.toString("utf8");

    console.log(s);

    const m = s.match(/Finished making:\s+([^\s]+)\s+([^\s]+)/);
    if (m) {
      name = m[1];
      version = m[2];
    }
  }

  const p = await proc;
  console.log(p);

  if (p.exitCode !== 0) {
    throw new Error(`unexpected exit ${p.exitCode} from makepkg`);
  }

  let arch = "any";

  console.log(`#<CI>publish ${name}-${version}-${arch}.pkg.tar.xz`);

  if (publish !== undefined) {
    for await (const chunk of createReadStream(
      join(stagingDir, `pkg/${name}/.PKGINFO`),
      utf8StreamOptions
    )) {
      const r = chunk.match(/arch\s+=\s+(\w+)/);
      if (r) {
        arch = r[1];
      }
    }

    context.properties["arch"] = arch;

    publish = publish.replace(/\{\{(\w+)\}\}/m, (match, key, offset, string) =>
      context.evaluate(key)
    );

    console.log(`cp ${name}-${version}-${arch}.pkg.tar.xz ${publish}`);

    await execa("cp", [`${name}-${version}-${arch}.pkg.tar.xz`, publish], {
      cwd: stagingDir
    });
  }
}
