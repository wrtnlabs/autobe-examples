import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_moderator_refresh_inactive_account(
  connection: api.IConnection,
) {
  // Step 1: Create a community moderator account with inactive status
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();
  const moderatorCreateData = {
    registered_user_id: registeredUserId,
    moderation_permissions: JSON.stringify({
      can_remove_posts: true,
      can_remove_comments: true,
      can_ban_users: true,
      can_warn_users: true,
      can_pin_posts: true,
      can_edit_rules: true,
      can_manage_moderators: true,
      can_approve_posts: true,
    }),
    assigned_communities: JSON.stringify([]),
    appointed_by: "system_admin",
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "inactive", // Set as inactive to test refresh failure
    appointed_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://moderator.test.com/register",
    referrer: "https://test.com",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  // Step 2: Create the inactive moderator account and get refresh token
  const createdModerator = await api.functional.auth.communityModerator.join(
    connection,
    { body: moderatorCreateData },
  );
  typia.assert(createdModerator);

  const refreshToken = createdModerator.token.refresh;
  TestValidator.equals(
    "refresh token obtained from inactive account",
    refreshToken.length > 0,
    true,
  );

  // Step 3: Attempt to refresh token using the inactive account's refresh token
  // This should fail because the moderator account is inactive
  const refreshRequest = {
    refresh_token: refreshToken,
  } satisfies IRedditPlatformCommunityModerator.IRefresh;

  // Step 4: Validate that the refresh operation fails with authentication error
  await TestValidator.error(
    "inactive moderator refresh should fail",
    async () => {
      await api.functional.auth.communityModerator.refresh(connection, {
        body: refreshRequest,
      });
    },
  );
}
