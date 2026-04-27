import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community platform vote creation data for E2E testing.
 *
 * Generates a complete ICommunityPlatformVote.ICreate with randomized values.
 * Accepts an optional DeepPartial input for test-time overrides.
 *
 * The generated vote targets either a post or a comment (randomly chosen),
 * with a randomly generated UUID as the target identifier. The vote value
 * is randomly set to either +1 (upvote) or -1 (downvote).
 *
 * @param input - Optional partial data to override specific fields
 * @returns A fully populated ICommunityPlatformVote.ICreate ready for API requests
 */
export function prepare_random_community_platform_vote(
  input?: DeepPartial<ICommunityPlatformVote.ICreate>,
): ICommunityPlatformVote.ICreate {
  return {
    target_type:
      input?.target_type ?? RandomGenerator.pick(["post", "comment"] as const),
    target_id: input?.target_id ?? typia.random<string & tags.Format<"uuid">>(),
    value: input?.value ?? RandomGenerator.pick([-1, 1] as const),
  };
}
