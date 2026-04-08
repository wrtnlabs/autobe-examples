import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit community post vote creation data for E2E testing.
 *
 * Generates a complete IRedditCommunityPostVote.ICreate with a randomized vote
 * value. The value field accepts +1 for an upvote or -1 for a downvote,
 * randomly selected to simulate realistic user voting behavior.
 *
 * This function supports test-time customization through the optional input
 * parameter, allowing tests to override specific properties while auto-generating
 * the rest. All properties use DeepPartial semantics for nested customization.
 *
 * @param input Optional partial input for test customization
 * @returns Complete IRedditCommunityPostVote.ICreate object
 */
export function prepare_random_reddit_community_post_vote(
  input?: DeepPartial<IRedditCommunityPostVote.ICreate>,
): IRedditCommunityPostVote.ICreate {
  return {
    value: input?.value ?? RandomGenerator.pick([1, -1] as const),
  };
}
