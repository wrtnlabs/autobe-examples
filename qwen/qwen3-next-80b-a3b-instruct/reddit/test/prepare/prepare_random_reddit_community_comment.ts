import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_comment(
  input?: DeepPartial<IRedditCommunityComment.ICreate>,
): IRedditCommunityComment.ICreate {
  return {
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 12,
      }),
    parent_comment_id:
      input?.parent_comment_id ??
      (typia.random<number>() > 0.7
        ? null
        : typia.random<string & tags.Format<"uuid">>()),
  };
}
