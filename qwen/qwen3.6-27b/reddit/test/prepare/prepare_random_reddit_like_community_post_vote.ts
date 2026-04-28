import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit-like community post vote creation data for E2E testing.
 *
 * Generates a complete IRedditLikeCommunityPostVote.ICreate with randomized values.
 * The direction is randomly selected between 'up' and 'down' to represent
 * upvotes and downvotes respectively. Submitting a vote when one already exists replaces
 * the existing vote direction.
 */
export function prepare_random_reddit_like_community_post_vote(
  input?: DeepPartial<IRedditLikeCommunityPostVote.ICreate>,
): IRedditLikeCommunityPostVote.ICreate {
  return {
    direction:
      input?.direction ?? RandomGenerator.pick(["up", "down"] as const),
  };
}
