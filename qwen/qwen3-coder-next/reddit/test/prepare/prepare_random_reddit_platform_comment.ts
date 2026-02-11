import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_comment(
  input?: DeepPartial<IRedditPlatformComment.ICreate>,
): IRedditPlatformComment.ICreate {
  return {
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 8,
        wordMin: 4,
        wordMax: 10,
      }),
    parent_comment_id:
      input?.parent_comment_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
