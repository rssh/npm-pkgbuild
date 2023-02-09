import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { execa } from "execa";
import { EmptyContentEntry, ReadableStreamContentEntry } from "content-entry";
import { transform } from "content-entry-transform";
import { aggregateFifo } from "aggregate-async-iterator";
import {
  keyValueTransformer,
  equalSeparatedKeyValuePairOptions
} from "key-value-transformer";
import { Packager } from "./packager.mjs";
import { fieldProvider, copyEntries, utf8StreamOptions } from "../util.mjs";

const DOCKERFILE = "Dockerfile";

function* keyValueLines(key, value, options) {
  yield `LABEL ${key}="${value}"${options.lineEnding}`;
}

const labelKeyValuePairs = {
  ...equalSeparatedKeyValuePairOptions,
  keyValueLines
};

const dependenciesToFrom = {
  node: "node",
  "nginx-mainline": "nginx",
  nginx: "nginx"
};

export class DOCKER extends Packager {
  static get name() {
    return "docker";
  }

  static get description() {
    return `generate container image with ${this.name}`;
  }

  async execute(
    sources,
    transformer,
    dependencies,
    options,
    expander = v => v
  ) {
    const { properties, staging, destination } = await this.prepareExecute(
      options
    );

    async function* trailingLines() {
      for (const [k, v] of Object.entries(dependencies)) {
        if (dependenciesToFrom[k]) {
          yield `
FROM ${dependenciesToFrom[k]}:${v.replace(/[>=]*/, "")}
`;
        }
      }

      if (options.from) {
        for (const [k, v] of Object.entries(options.from)) {
          yield `
FROM ${k}:${v}
`;
        }

        if (options.entrypoints) {
          yield `
ENTRYPOINT ["node", ${Object.values(options.entrypoints)[0]}]
`;
        }
      }
    }

    const fp = fieldProvider(properties, fields);

    transformer.push({
      name: DOCKERFILE,
      match: entry => entry.name === DOCKERFILE,
      transform: async entry =>
        new ReadableStreamContentEntry(
          entry.name,
          keyValueTransformer(await entry.readStream, fp, {
            ...labelKeyValuePairs,
            trailingLines
          })
        ),
      createEntryWhenMissing: () => new EmptyContentEntry(DOCKERFILE)
    });

    for await (const file of copyEntries(
      transform(aggregateFifo(sources), transformer),
      staging,
      expander
    )) {
      if (options.verbose) {
        console.log(file.destination);
      }
    }

    if (options.verbose) {
      console.log(await readFile(join(staging, DOCKERFILE), utf8StreamOptions));
    }

    let image = "";

    if (!options.dry) {
      const docker = await execa(this.constructor.name, ["build", staging], {
        cwd: staging
      });

      const lines = docker.stdout.split(/\n/);
      image = lines[lines.length - 1];

      if (options.verbose) {
        console.log(docker.stdout);
      }
    }

    //console.log("IMAGE",image);
    return image;
  }
}

/**
 * @see {https://docs.docker.com/engine/reference/builder/}
 */
const fields = {
  version: { type: "string", mandatory: true },
  description: { type: "string" },
  author: { alias: "maintainer", type: "string" }
};
