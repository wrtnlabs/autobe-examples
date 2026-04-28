import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit-like community comment vote creation data for E2E testing.
 *
 * Generates a complete IRedditLikeCommunityCommentVote.ICreate with randomized values.
 * The comment_id is optional and defaults to a random UUID when not provided.
 * The direction is randomly selected from 'upvote' or 'downvote'.
 *
 * @param input - Optional DeepPartial input for test-time customization
 * @returns A complete IRedditLikeCommunityCommentVote.ICreate
 */
export function prepare_random_reddit_like_community_comment_vote(
  input?: DeepPartial<IRedditLikeCommunityCommentVote.ICreate>,
): IRedditLikeCommunityCommentVote.ICreate {
  return {
    comment_id:
      input?.comment_id ?? typia.random<string & tags.Format<"uuid">>(),
    direction:
      input?.direction ?? RandomGenerator.pick(["upvote", "downvote"] as const),
  };
}