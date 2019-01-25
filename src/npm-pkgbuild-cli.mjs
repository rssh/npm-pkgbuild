import { version } from "../package.json";
import { pkgbuild } from "./pkgbuild";
import { systemd } from "./systemd";
import { pacman } from "./pacman";
import { content } from "./content";
import fs, { createWriteStream } from "fs";
import program from "caporal";
import { join } from "path";
import execa from "execa";
import { utf8StreamOptions } from "./util";
import { createContext } from "./context";

program
  .description("create arch linux package from npm")
  .version(version)
  .option("-p --package <dir>", "package directory", undefined, process.cwd())
  .option("-i --installdir <dir>", "install directory package content base")
  .option("-o --output <dir>", "output directory", undefined, "build")
  .argument(
    "[stages...]",
    "stages to execute",
    /pkgbuild|makepkg|content|systemd|pacman/,
    "pkgbuild"
  )
  .action(async (args, options) => {
    const stagingDir = options.output;
    await fs.promises.mkdir(stagingDir, { recursive: true });

    const context = await createContext(options.package, options);

    for (const stage of args.stages) {
      logger.info(`executing ${stage}...`);
      switch (stage) {
        case "pkgbuild":
          await pkgbuild(
            context,
            stagingDir,
            createWriteStream(join(stagingDir, "PKGBUILD"), utf8StreamOptions)
          );
          break;
        case "makepkg":
          const proc = execa("makepkg", ["-f"], { cwd: stagingDir });

          proc.stdout.pipe(process.stdout);
          proc.stderr.pipe(process.stderr);

          await proc;
          break;
        case "systemd":
          await systemd(context, stagingDir);
          break;
        case "pacman":
          await pacman(context, stagingDir);
          break;
        case "content":
          await content(context, stagingDir);
          break;

        default:
          logger.error(`unknown stage ${stage}`);
      }
    }
  });

program.parse(process.argv);
