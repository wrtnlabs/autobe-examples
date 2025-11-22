import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformAuthLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAuthLogoutResponse";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Validate complete session data cleanup after community moderator logout
 * operation.
 *
 * Community moderators have elevated privileges and access to sensitive
 * moderation tools. When they logout, it's critical that ALL session-related
 * data is completely removed from the system to prevent security
 * vulnerabilities and unauthorized access to moderation capabilities.
 *
 * This test creates a moderator account, establishes an active session, then
 * validates that the logout operation properly terminates all session data
 * including authentication tokens and user context.
 *
 * Test Process:
 *
 * 1. Create community moderator account with required permissions
 * 2. Establish active authentication session
 * 3. Execute logout operation
 * 4. Validate complete session cleanup and token invalidation
 */
export async function test_api_moderator_logout_session_cleanup(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account to establish active session
  const moderatorData = {
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
    assigned_communities: JSON.stringify(["community-1", "community-2"]),
    appointed_by: "system_admin",
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    href: "https://example.com/register",
    referrer: "https://google.com",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Validate moderator account creation was successful
  TestValidator.equals(
    "moderator account created successfully",
    moderator.moderator.id.length > 0,
    true,
  );

  // Validate authentication token was provided
  TestValidator.equals(
    "access token provided after moderator creation",
    moderator.token.access.length > 0,
    true,
  );

  // Step 2: Execute logout operation to terminate session
  const logoutResponse: IRedditPlatformAuthLogoutResponse =
    await api.functional.redditPlatform.communityModerator.auth.sessions.logout(
      connection,
    );
  typia.assert(logoutResponse);

  // Step 3: Validate logout response structure and content
  TestValidator.equals(
    "logout operation completed successfully",
    logoutResponse.success,
    true,
  );

  TestValidator.equals(
    "logout confirmation message is provided",
    logoutResponse.message.length > 0,
    true,
  );

  TestValidator.predicate(
    "session termination timestamp is recorded",
    logoutResponse.session_terminated_at.length > 0,
  );

  TestValidator.equals(
    "authentication tokens are invalidated",
    logoutResponse.tokens_invalidated,
    true,
  );

  // Step 4: Verify session cleanup completeness
  TestValidator.predicate(
    "session termination timestamp is valid ISO datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      logoutResponse.session_terminated_at,
    ),
  );

  TestValidator.predicate(
    "logout message indicates session cleanup",
    logoutResponse.message.toLowerCase().includes("logout") ||
      logoutResponse.message.toLowerCase().includes("session"),
  );
}
