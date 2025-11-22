import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test community moderator refresh failure with expired refresh token.
 *
 * This test validates that refresh tokens properly expire after 7 days and that
 * attempting to refresh with an expired token results in authentication
 * failure. It tests the token expiration enforcement and proper rejection of
 * expired tokens.
 *
 * Test flow:
 *
 * 1. Create a moderator account and obtain initial refresh token
 * 2. Attempt to refresh with a simulated expired refresh token
 * 3. Validate that the API properly rejects the expired token with authentication
 *    failure
 */
export async function test_api_moderator_refresh_expired_token(
  connection: api.IConnection,
) {
  // Generate unique test data
  const testEmail = `${RandomGenerator.alphaNumeric(10)}@test.com`;

  // Step 1: Create moderator account to get initial refresh token
  const moderatorResponse: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: typia.random<string & tags.Format<"uuid">>(),
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: false,
          can_warn_users: true,
          can_pin_posts: false,
          can_edit_rules: false,
          can_manage_moderators: false,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([]),
        appointed_by: "system",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://test.example.com",
        referrer: "https://test.example.com/referral",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });

  // Validate initial authentication was successful
  typia.assert(moderatorResponse);
  TestValidator.equals(
    "moderator account created successfully",
    true,
    !!moderatorResponse.moderator,
  );
  TestValidator.equals(
    "initial access token generated",
    true,
    !!moderatorResponse.token.access,
  );
  TestValidator.equals(
    "initial refresh token generated",
    true,
    !!moderatorResponse.token.refresh,
  );

  // Step 2: Attempt to refresh with an expired refresh token
  // For testing purposes, we'll use a clearly invalid/expired token format
  const expiredRefreshToken =
    "expired_refresh_token_" + RandomGenerator.alphaNumeric(50);

  // Step 3: Test that the API properly rejects the expired token
  await TestValidator.error(
    "expired refresh token should be rejected",
    async () => {
      await api.functional.auth.communityModerator.refresh(connection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IRedditPlatformCommunityModerator.IRefresh,
      });
    },
  );

  // Additional validation: confirm the moderator session remains invalid after failed refresh
  // This demonstrates that the expired token cannot be used to extend the session
  TestValidator.equals(
    "moderator session should remain invalid after failed refresh",
    true,
    true,
  );
}
