import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test community moderator login failure with inactive account status. Attempt
 * to login with a moderator account that has inactive status, expecting
 * authentication failure. Validates that inactive moderators cannot access
 * moderation tools and community management capabilities.
 */
export async function test_api_moderator_login_inactive_account(
  connection: api.IConnection,
) {
  // Generate test data
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123!";

  // 1. Create a moderator account with inactive status
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        registered_user_id: typia.random<string & tags.Format<"uuid">>(),
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: false,
          can_warn_users: true,
          can_pin_posts: true,
          can_edit_rules: false,
          can_manage_moderators: false,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([]),
        appointed_by: typia.random<string>(),
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "inactive", // Set status to inactive
        appointed_at: new Date().toISOString(),
        href: "https://example.com/test",
        referrer: "https://example.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
  );

  typia.assert(moderator);

  // 2. Attempt to login with the inactive moderator account
  // We expect this to fail because the account is inactive
  await TestValidator.error("inactive moderator cannot login", async () => {
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        username: moderatorEmail,
        password: moderatorPassword,
        href: "https://example.com/test",
        referrer: "https://example.com",
      },
    });
  });
}
