import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_banned_users_create } from "../../../generate/generate_random_community_platform_admin_banned_users_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_banned_user } from "../../../prepare/prepare_random_community_platform_banned_user";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_admin_banned_users_create_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Test admin user successfully bans a community member.
  // - Authenticate as admin using /auth/admin/join.
  // - Create a community membership for a user via /communityPlatform/user/communities.
  // - Attempt to ban the user in the community by posting a ban record with required fields including ban reason and timestamps.
  // - Validate the ban record is created with correct user, community, and timestamps.
  // - Check that the ban record appears in retrieval queries for banned users.
  // Scenario 2: Test banning fails when the user already has an active ban in the community.
  // - Authenticate as admin using /auth/admin/join.
  // - Create a community membership for a user via /communityPlatform/user/communities.
  // - Ban the user once successfully.
  // - Attempt to ban the same user again in the same community.
  // - Validate that the operation fails with a uniqueness constraint error to prevent duplicate bans.
  // Scenario 3: Test authorization enforcement for ban creation.
  // - Attempt to create a ban record without admin authentication.
  // - Validate the request is denied with an authorization error.
  // - Authenticate as admin using /auth/admin/join.
  // - Repeat ban creation successfully to confirm authorization requirement and success path.
  // Admin join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // User join
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, { body: {} });
  // Create community for user
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      { body: {} },
    );
  // Generate a fake user ID for banned user for testing
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // Ban creation info
  const now = new Date().toISOString();
  const banReason = "Violation of community rules.";
  // Scenario 1: Admin bans user successfully
  const banBody: ICommunityPlatformBannedUser.ICreate = {
    community_platform_user_id: bannedUserId,
    community_platform_community_id: (community as any)["community_platform_community_id"] ?? "",
    banned_at: now,
    unbanned_at: null,
    ban_reason: banReason,
  };
  const banResult =
    await generate_random_community_platform_admin_banned_users_create(
      adminConnection,
      { body: banBody },
    );
  typia.assert(banResult);
  // Cast banResult to any to access properties safely
  const banResultAny = banResult as any;
  // Verify ban belongs to correct user and community
  TestValidator.equals(
    "banned user id correct",
    banResultAny["community_platform_user_id"] as string,
    bannedUserId,
  );
  TestValidator.equals(
    "banned community id correct",
    banResultAny["community_platform_community_id"] as string,
    (community as any)["community_platform_community_id"] ?? "",
  );
  TestValidator.equals("ban reason correct", banResultAny["ban_reason"] as string, banReason);
  // Scenario 2: Ban duplicates fail
  await TestValidator.error("duplicate ban", async () => {
    await generate_random_community_platform_admin_banned_users_create(
      adminConnection,
      {
        body: banBody,
      },
    );
  });
  // Scenario 3: Authorization enforcement
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "ban creation denied without admin auth",
    401,
    async () => {
      await generate_random_community_platform_admin_banned_users_create(
        unauthenticatedConnection,
        { body: banBody },
      );
    },
  );
  // Confirm successful ban creation after authorization
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection2, { body: {} });
  const banResult2 =
    await generate_random_community_platform_admin_banned_users_create(
      adminConnection2,
      { body: banBody },
    );
  typia.assert(banResult2);
  const banResult2Any = banResult2 as any;
  TestValidator.equals(
    "banned user id correct after auth",
    banResult2Any["community_platform_user_id"] as string,
    bannedUserId,
  );
  TestValidator.equals(
    "banned community id correct after auth",
    banResult2Any["community_platform_community_id"] as string,
    (community as any)["community_platform_community_id"] ?? "",
  );
  TestValidator.equals("ban reason correct after auth", banResult2Any["ban_reason"] as string, banReason);
}
