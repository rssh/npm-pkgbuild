import { join } from "path";
import { FileSystemEntry } from "content-entry-filesystem";

import globby from "globby";
import { asArray } from "../util.mjs";

import { ContentProvider } from "./content-provider.mjs";

/**
 * content provided form the file system
 */
export class FileContentProvider extends ContentProvider {
  async *entries(context) {
    const content = context.expand(this.content);

    Object.entries(content).map(async ([source, dest]) => {
      let cwd, pattern;

      if (typeof source === "string" || source instanceof String) {
        cwd = context.dir;
        pattern = source;
      } else {
        cwd = join(context.dir, source.base);
        pattern = source.pattern || "**/*";
      }

      for (const name of await globby(asArray(pattern), {
        cwd
      })) {
        yield new FileSystemEntry(name);
      }
    });
  }
}
