import { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community hub vote creation data for E2E testing.
 *
 * Generates a complete ICommunityHubVote.ICreate with randomized values for
 * target_type, target_id, and vote value. The voting member's identity is
 * derived from the authenticated session and is not included in this payload.
 *
 * The target_type is randomly selected between 'post' and 'comment', target_id
 * is a UUID-formatted string, and value is randomly 1 (upvote) or -1 (downvote).
 * All properties can be overridden via the optional input parameter.
 */
export function prepare_random_community_hub_vote(
  input?: DeepPartial<ICommunityHubVote.ICreate>,
): ICommunityHubVote.ICreate {
  return {
    target_type:
      input?.target_type ?? RandomGenerator.pick(["post", "comment"] as const),
    target_id: input?.target_id ?? typia.random<string & tags.Format<"uuid">>(),
    value: input?.value ?? RandomGenerator.pick([1, -1] as const),
  };
}
