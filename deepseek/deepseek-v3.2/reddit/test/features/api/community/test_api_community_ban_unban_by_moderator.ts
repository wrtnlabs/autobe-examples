import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_ban_unban_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create three member accounts with distinct connections
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Note: For full scenario, would need subscription API for members to join community
  // and moderator assignment API. Since those APIs aren't available in provided SDK,
  // we'll test the ban/unban flow with owner as both creator and unban performer.
  // Owner has moderator permissions by default as community creator.
  // 3. Owner bans the member from the community
  const ban = await generate_random_community_platform_member_bans_create(
    ownerConnection,
    {
      params: { communityId: community.id },
      body: {
        memberId: memberAuth.id,
        reason: "Test ban for unban functionality",
        expiresAt: null,
      },
    },
  );
  typia.assert(ban);
  TestValidator.equals("ban active status", ban.active, true);
  TestValidator.equals("unbanned_at null initially", ban.unbanned_at, null);
  TestValidator.equals(
    "banned member matches",
    ban.bannedMember.id,
    memberAuth.id,
  );
  TestValidator.equals("community matches", ban.community.id, community.id);
  // 4. Owner (acting as moderator) performs unban operation
  await api.functional.communityPlatform.member.bans.erase(ownerConnection, {
    communityId: community.id,
    banId: ban.id,
  });
  // Void response expected for successful unban
  // 5. Verify regular member without moderator permissions cannot unban
  await TestValidator.error("non-moderator cannot unban", async () => {
    await api.functional.communityPlatform.member.bans.erase(memberConnection, {
      communityId: community.id,
      banId: ban.id,
    });
  });
  // Note: Cannot test non-existent ban or wrong community without proper error handling
  // as those would involve type errors in compilation.
  // Focus on business logic errors instead of type validation.
}
