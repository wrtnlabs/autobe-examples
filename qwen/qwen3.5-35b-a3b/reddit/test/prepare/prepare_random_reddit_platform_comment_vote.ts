import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit platform comment vote creation data for E2E testing.
 *
 * Generates a complete IRedditPlatformCommentVote.ICreate with a randomized
 * vote_type. The vote_type can be "up" (upvote), "down" (downvote), or
 * null (remove vote), simulating realistic voting scenarios.
 */
export function prepare_random_reddit_platform_comment_vote(
  input?: DeepPartial<IRedditPlatformCommentVote.ICreate>,
): IRedditPlatformCommentVote.ICreate {
  return {
    vote_type:
      input?.vote_type ?? RandomGenerator.pick(["up", "down", null] as const),
  };
}
