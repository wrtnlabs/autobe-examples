import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random reddit-like community post comment creation data for E2E testing.
 *
 * Generates a complete IRedditLikeCommunityPostComment.ICreate with randomized values.
 * Useful for seeding test databases, simulating API requests, and validating comment
 * creation workflows within threaded discussions.
 *
 * @param input - Optional DeepPartial override for specific fields during testing
 * @returns A fully populated IRedditLikeCommunityPostComment.ICreate object
 */
export function prepare_random_reddit_like_community_post_comment(
  input?: DeepPartial<IRedditLikeCommunityPostComment.ICreate>,
): IRedditLikeCommunityPostComment.ICreate {
  return {
    body: input?.body ?? RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId:
      input?.parentCommentId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
