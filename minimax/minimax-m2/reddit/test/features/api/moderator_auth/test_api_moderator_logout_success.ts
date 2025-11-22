import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformAuthLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAuthLogoutResponse";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test successful logout operation for authenticated community moderator.
 *
 * This test validates the complete logout workflow by first creating an
 * authenticated community moderator session, then testing the logout
 * functionality to ensure proper session termination and security confirmation.
 * The test verifies that logout requests complete successfully with the
 * expected response structure including success status, confirmation message,
 * session termination timestamp, and token invalidation confirmation.
 *
 * The test ensures the logout process terminates the moderator's session across
 * all platform components and provides clear success confirmation, which is
 * critical for security and proper session management.
 *
 * Implementation approach:
 *
 * 1. Create new community moderator account with authentication credentials
 * 2. Verify successful authentication with proper token generation
 * 3. Execute logout request to terminate the session
 * 4. Validate logout response structure and success indicators
 * 5. Confirm all required response fields are properly populated
 */
export async function test_api_moderator_logout_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new community moderator account to establish authenticated session
  const moderatorData = {
    registered_user_id: typia.random<string & tags.Format<"uuid">>(),
    moderation_permissions: JSON.stringify({
      can_remove_posts: true,
      can_remove_comments: true,
      can_ban_users: true,
      can_warn_users: true,
      can_pin_posts: true,
      can_edit_rules: false,
      can_manage_moderators: false,
      can_approve_posts: true,
    }),
    assigned_communities: JSON.stringify([
      typia.random<string & tags.Format<"uuid">>(),
      typia.random<string & tags.Format<"uuid">>(),
    ]),
    appointed_by: "system_administrator",
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://reddit-platform.example.com/register",
    referrer: "https://reddit-platform.example.com",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Create the community moderator account
  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorData satisfies IRedditPlatformCommunityModerator.ICreate,
    });

  // Validate the moderator creation response
  typia.assert(moderator);
  TestValidator.equals("moderator account creation successful", true, true);

  // Verify the authenticated response contains required data
  TestValidator.equals(
    "moderator token generated",
    typeof moderator.token.access,
    "string",
  );
  TestValidator.equals(
    "moderator refresh token generated",
    typeof moderator.token.refresh,
    "string",
  );
  TestValidator.equals(
    "moderator token expires",
    typeof moderator.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "refresh token expires",
    typeof moderator.token.refreshable_until,
    "string",
  );

  // Verify moderator profile information is present
  TestValidator.equals(
    "moderator ID present",
    typeof moderator.moderator.id,
    "string",
  );
  TestValidator.equals(
    "moderator permissions present",
    typeof moderator.moderator.moderation_permissions,
    "object",
  );
  TestValidator.equals(
    "moderator status active",
    moderator.moderator.active_status,
    "active",
  );

  // Step 2: Execute the logout request to terminate the session
  const logoutResponse: IRedditPlatformAuthLogoutResponse =
    await api.functional.redditPlatform.communityModerator.auth.sessions.logout(
      connection,
    );

  // Validate the logout response
  typia.assert(logoutResponse);

  // Step 3: Verify logout success indicators
  TestValidator.equals("logout success status", logoutResponse.success, true);
  TestValidator.equals(
    "logout confirmation message",
    typeof logoutResponse.message,
    "string",
  );
  TestValidator.equals(
    "session termination timestamp",
    typeof logoutResponse.session_terminated_at,
    "string",
  );
  TestValidator.equals(
    "tokens invalidation status",
    logoutResponse.tokens_invalidated,
    true,
  );

  // Additional validation of response content
  TestValidator.predicate(
    "session termination timestamp is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      logoutResponse.session_terminated_at,
    ),
  );

  TestValidator.predicate(
    "confirmation message indicates success",
    logoutResponse.message.toLowerCase().includes("success") ||
      logoutResponse.message.toLowerCase().includes("logout") ||
      logoutResponse.message.toLowerCase().includes("terminated"),
  );

  // Verify that the response contains meaningful confirmation
  TestValidator.predicate(
    "logout response provides clear confirmation",
    logoutResponse.message.length > 0 &&
      logoutResponse.session_terminated_at.length > 0,
  );
}
