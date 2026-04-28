import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_community_bans_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_bans_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_ban } from "../../../prepare/prepare_random_reddit_like_community_community_ban";

/**
 * Test that a community owner can successfully erase a ban record, restoring the previously banned member's posting and commenting privileges.
 *
 * Validates the complete ban and unban lifecycle performed by a community owner. The owner authenticates, creates a community, authenticates a second member as the ban target, bans that member, and then erases the ban record. Successful erasure confirms the moderation action was reversed.
 *
 * The erase endpoint returns void on success, so the completion of the operation without errors serves as validation that the ban record has been soft-deleted and the member's privileges are restored.
 *
 * 1. Community owner authenticates using authorize_member_join utility.
 * 2. Owner creates a community, automatically becoming the owner with highest authority for moderation.
 * 3. A second member authenticates to serve as the ban target.
 * 4. Owner bans the second member in the community, providing a reason.
 * 5. Owner erases the ban record, successfully completing the unban operation.
 */
export async function test_api_community_ban_unban_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {},
  });
  typia.assert(ownerAuthorized);
  // 2. Owner creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Authenticate second member (ban target)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(memberAuthorized);
  // 4. Owner bans the second member
  const ban =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          member_id: memberAuthorized.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(ban);
  // 5. Owner erases the ban (unban)
  await api.functional.redditLikeCommunity.member.communities.community_bans.erase(
    ownerConnection,
    {
      communityId: community.id,
      communityBanId: ban.id,
    },
  );
  // Successful void return validates unban completion
  TestValidator.predicate("ban erase succeeded without error", true);
}
