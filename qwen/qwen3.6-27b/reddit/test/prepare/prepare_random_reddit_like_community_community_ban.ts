import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community ban creation data for E2E testing.
 *
 * Generates a complete IREdditLikeCommunityCommunityBan.ICreate with randomized values.
 * This prepares test data for banning a member from a community, including the member
 * identifier and the reason for the ban action.
 */
export function prepare_random_reddit_like_community_community_ban(
  input?: DeepPartial<IREdditLikeCommunityCommunityBan.ICreate>,
): IREdditLikeCommunityCommunityBan.ICreate {
  return {
    member_id: input?.member_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
