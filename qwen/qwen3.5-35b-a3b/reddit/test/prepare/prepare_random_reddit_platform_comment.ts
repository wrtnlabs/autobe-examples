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
    reddit_platform_post_id:
      input?.reddit_platform_post_id ??
      typia.random<string & tags.Format<"uuid">>(),
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 5,
      }),
    reddit_platform_comments_id:
      input?.reddit_platform_comments_id ??
      typia.random<string & tags.Format<"uuid">>() ??
      null,
  };
}
