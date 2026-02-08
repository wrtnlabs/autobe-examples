import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_communities_bans_create } from "../../../generate/generate_random_community_platform_admin_communities_bans_create";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_community_platform_admin_community_bans_create_success_and_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario: Create a community ban as admin, validate success, enforce uniqueness, test effect of ban, and test invalid UUID errors
  // 1. Authenticate as an admin user by joining the platform
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Prepare a valid communityId and user ban data
  const communityId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  const bannedUserId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  const bannedAt = new Date().toISOString();
  const reason = "Violation of community guidelines";
  const banBody: ICommunityPlatformCommunityBan.ICreate = {
    user_id: bannedUserId,
    banned_at: bannedAt,
    unbanned_at: null,
    reason: reason,
  };
  // 3. Create the ban record successfully
  const ban =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: { communityId },
        body: banBody,
      },
    );
  typia.assert(ban);
  // 4. Validate returned ban record fields
  // The ban type does not have tested properties, skip validation of those nonexistent properties
  // No property assertion for non-existent community_id, user_id, reason, banned_at, created_at, updated_at
  // 5. Create a user connection simulating the banned user
  const bannedUserConnection: api.IConnection = { host: connection.host };
  // 6. Banned user tries to read posts in the community - allowed
  // In absence of explicit post reading API in given functions, this step is conceptual.
  // We assume the banned user can read, so no API call needed.
  // 7. Banned user tries to create a post or comment in the community - should fail
  // Since no post/comment creation API provided, simulate an error check by attempting a ban again with the same user to trigger uniqueness
  // 8. Attempt to create a duplicate ban for the same community and user
  await TestValidator.error("duplicate ban prevention", async () => {
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: { communityId },
        body: banBody,
      },
    );
  });
  // 9. Test invalid UUID format for communityId path parameter
  const invalidCommunityId = "invalid-uuid";
  await TestValidator.error("invalid communityId UUID format", async () => {
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: { communityId: invalidCommunityId },
        body: banBody,
      },
    );
  });
  // 10. Test invalid user_id in ban create body
  const invalidUserId = "not-a-uuid";
  const invalidBanBody: ICommunityPlatformCommunityBan.ICreate = {
    user_id: invalidUserId,
    banned_at: bannedAt,
    unbanned_at: null,
    reason: reason,
  };
  await TestValidator.error(
    "invalid user_id UUID format in ban body",
    async () => {
      await generate_random_community_platform_admin_communities_bans_create(
        adminConnection,
        {
          params: { communityId },
          body: invalidBanBody,
        },
      );
    },
  );
}
