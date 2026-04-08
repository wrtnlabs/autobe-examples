import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random reddit community comment creation data for E2E testing.
 *
 * Generates a complete IRedditCommunityComment.ICreate with randomized values
 * for the comment content and optional parent comment reference. The function
 * supports partial input overrides for flexible test case customization.
 */
export function prepare_random_reddit_community_comment(
  input?: DeepPartial<IRedditCommunityComment.ICreate> | undefined,
): IRedditCommunityComment.ICreate {
  return {
    content: input?.content ?? RandomGenerator.paragraph({ sentences: 2 }),
    redditCommunityCommentId:
      input?.redditCommunityCommentId ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
