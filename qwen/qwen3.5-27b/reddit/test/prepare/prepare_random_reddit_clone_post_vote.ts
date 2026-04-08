import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit clone post vote data for E2E testing.
 *
 * Generates a complete IRedditClonePostVote.ICreate with randomized vote type.
 * The vote_type field randomly selects between 'upvote' and 'downvote' to
 * simulate user voting behavior on posts.
 */
export function prepare_random_reddit_clone_post_vote(
  input?: DeepPartial<IRedditClonePostVote.ICreate>,
): IRedditClonePostVote.ICreate {
  return {
    vote_type:
      input?.vote_type ?? RandomGenerator.pick(["upvote", "downvote"] as const),
  };
}
