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
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 15 }),
    parent_comment_id:
      input?.parent_comment_id !== undefined
        ? input.parent_comment_id
        : Math.random() < 0.3
          ? typia.random<string & tags.Format<"uuid">>()
          : null,
  };
}
