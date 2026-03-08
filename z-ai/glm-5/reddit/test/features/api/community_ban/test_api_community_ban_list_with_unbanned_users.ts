import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_bans_create } from "../../../generate/generate_random_community_platform_member_communities_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that a community owner can filter the ban list to show both active and
 * unbanned users, demonstrating the system preserves ban history for transparency.
 *
 * Setup:
 * 1. Owner creates a community and subscribes
 * 2. Another member subscribes to the community
 * 3. Owner bans that member with a documented reason
 * 4. Owner unbans (removes) the ban, restoring user's participation rights
 *
 * Execution:
 * Call the ban list endpoint with status='all' filter to include both active
 * and removed bans.
 *
 * Validation:
 * - Verify the response includes the unbanned user's ban record with deleted_at
 *   timestamp populated
 * - Verify the status='active' filter returns only bans where deleted_at is null
 * - Verify the status='all' filter returns all ban records including those with
 *   deleted_at set
 */
export async function test_api_community_ban_list_with_unbanned_users(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner creates account and community
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, { body: {} });
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // Owner subscribes to their community
  await generate_random_community_platform_member_subscriptions_create(
    ownerConnection,
    { body: { community_id: community.id } },
  );
  // 2. Another member joins and subscribes
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {},
  });
  await generate_random_community_platform_member_subscriptions_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  // 3. Owner bans the member
  const banRecord =
    await generate_random_community_platform_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: {
          bannedUserId: memberAuth.member.id,
          reason: "Test ban reason for transparency verification",
        },
      },
    );
  typia.assert(banRecord);
  // Verify ban is active initially (deleted_at is null)
  TestValidator.equals("ban is active initially", banRecord.deleted_at, null);
  // 4. Owner unbans the member
  await api.functional.communityPlatform.member.communities.bans.unban(
    ownerConnection,
    {
      communityName: community.name,
      banId: banRecord.id,
    },
  );
  // 5. Test status='active' filter - should NOT include unbanned user
  const activeBans =
    await api.functional.communityPlatform.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { status: "active" },
      },
    );
  typia.assert(activeBans);
  const hasUnbannedInActive = activeBans.data.some(
    (ban) => ban.id === banRecord.id,
  );
  TestValidator.predicate(
    "unbanned user not in active list",
    !hasUnbannedInActive,
  );
  // 6. Test status='all' filter - should include unbanned user
  const allBans =
    await api.functional.communityPlatform.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { status: "all" },
      },
    );
  typia.assert(allBans);
  const unbannedBan = allBans.data.find((ban) => ban.id === banRecord.id);
  TestValidator.predicate(
    "unbanned ban record found in all list",
    unbannedBan !== undefined,
  );
  // Verify deleted_at is set (not null) for unbanned ban
  TestValidator.predicate(
    "unbanned ban has deleted_at set",
    unbannedBan!.deleted_at !== null,
  );
  // Verify banned user matches the original member
  TestValidator.equals(
    "unbanned user id matches",
    unbannedBan!.bannedUser.id,
    memberAuth.member.id,
  );
}
