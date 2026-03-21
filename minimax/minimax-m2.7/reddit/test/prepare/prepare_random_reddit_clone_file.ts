import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_file(
  input?: DeepPartial<IRedditCloneFile.ICreate>,
): IRedditCloneFile.ICreate {
  // MIME type options from schema
  const MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ] as const;
  return {
    file_data:
      input?.file_data ??
      Buffer.from(RandomGenerator.alphaNumeric(1024)).toString("base64"),
    mime_type: input?.mime_type ?? RandomGenerator.pick(MIME_TYPES),
    original_filename:
      input?.original_filename ??
      `${RandomGenerator.alphabets(8)}.${RandomGenerator.pick(["jpg", "png", "gif", "webp"] as const)}`,
    target_id: input?.target_id ?? typia.random<string & tags.Format<"uuid">>(),
    target_type:
      input?.target_type ??
      RandomGenerator.pick(["user", "community", "post"] as const),
  };
}
