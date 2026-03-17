import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_attachment(
  input?: DeepPartial<IRedditLikeAttachment.ICreate>,
): IRedditLikeAttachment.ICreate {
  return {
    fileUri: input?.fileUri ?? typia.random<string & tags.Format<"uri">>(),
    originalFilename:
      input?.originalFilename ??
      RandomGenerator.name() + "." + RandomGenerator.alphabets(3),
  };
}
