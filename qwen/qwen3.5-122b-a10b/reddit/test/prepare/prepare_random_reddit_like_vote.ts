import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit-like vote creation data for E2E testing.
 *
 * Generates a complete IRedditLikeVote.ICreate with randomized vote type selection.
 * The vote_type property is randomly chosen between "upvote" and "downvote" to
 * support testing both positive and negative voting scenarios.
 *
 * @param input - Optional partial input to override specific properties
 * @returns Complete IRedditLikeVote.ICreate object with all properties populated
 */
export function prepare_random_reddit_like_vote(
  input?: DeepPartial<IRedditLikeVote.ICreate>,
): IRedditLikeVote.ICreate {
  return {
    vote_type:
      input?.vote_type ?? RandomGenerator.pick(["upvote", "downvote"] as const),
  };
}
