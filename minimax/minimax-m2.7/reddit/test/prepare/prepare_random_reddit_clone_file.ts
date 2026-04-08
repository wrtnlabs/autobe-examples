import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_file(
  input?: DeepPartial<IRedditCloneFile.ICreate>,
): IRedditCloneFile.ICreate {
  return {
    file:
      input?.file ??
      typia.random<
        string & tags.ContentMediaType<"application/octet-stream">
      >(),
    originalFilename:
      input?.originalFilename ?? `${RandomGenerator.alphaNumeric(20)}.png`,
  };
}
