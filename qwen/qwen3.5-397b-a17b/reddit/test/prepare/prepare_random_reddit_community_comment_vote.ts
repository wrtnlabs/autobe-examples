import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit community comment vote creation data for E2E testing.
 *
 * Generates a complete IRedditCommunityCommentVote.ICreate with randomized vote value.
 * The vote value is randomly selected between 1 (upvote) and -1 (downvote).
 *
 * @param input Optional partial input for test customization
 * @returns Complete IRedditCommunityCommentVote.ICreate object
 */
export function prepare_random_reddit_community_comment_vote(
  input?: DeepPartial<IRedditCommunityCommentVote.ICreate>,
): IRedditCommunityCommentVote.ICreate {
  return {
    value: input?.value ?? RandomGenerator.pick([1, -1] as const),
  };
}
