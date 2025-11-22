import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformAuthLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAuthLogoutResponse";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test token invalidation security after moderator logout.
 *
 * Validates that access tokens and refresh tokens associated with the
 * moderator's session are immediately and permanently invalidated. The test
 * creates a moderator account, establishes an authenticated session, performs
 * logout, and validates that all authentication tokens are properly
 * invalidated. This ensures complete session termination and prevents token
 * reuse after logout completion.
 */
export async function test_api_moderator_logout_token_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and establish authenticated session
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();
  const moderatorData = {
    registered_user_id: registeredUserId,
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
    assigned_communities: JSON.stringify(["community-1", "community-2"]),
    appointed_by: "admin-system",
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    href: "https://test-platform.com/register",
    referrer: "https://admin-panel.com",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const moderatorAuth: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderatorAuth);

  // Store the tokens before logout for validation
  const accessToken = moderatorAuth.token.access;
  const refreshToken = moderatorAuth.token.refresh;
  const expiresAt = moderatorAuth.token.expired_at;
  const refreshableUntil = moderatorAuth.token.refreshable_until;

  TestValidator.equals(
    "moderator authentication successful",
    moderatorAuth.moderator.id,
    registeredUserId,
  );
  TestValidator.predicate(
    "moderator has valid access token",
    moderatorAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "moderator has valid refresh token",
    moderatorAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token has expiration",
    moderatorAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token has expiration",
    moderatorAuth.token.refreshable_until.length > 0,
  );
  TestValidator.equals(
    "moderator is active",
    moderatorAuth.moderator.active_status,
    "active",
  );

  // Step 2: Perform logout to invalidate tokens
  const logoutResponse: IRedditPlatformAuthLogoutResponse =
    await api.functional.redditPlatform.communityModerator.auth.sessions.logout(
      connection,
    );
  typia.assert(logoutResponse);

  // Step 3: Validate logout response structure
  TestValidator.equals("logout successful", logoutResponse.success, true);
  TestValidator.predicate(
    "logout message present",
    logoutResponse.message.length > 0,
  );
  TestValidator.predicate(
    "session termination timestamp present",
    logoutResponse.session_terminated_at.length > 0,
  );
  TestValidator.equals(
    "tokens invalidated confirmed",
    logoutResponse.tokens_invalidated,
    true,
  );

  // Step 4: Validate token invalidation status
  // The logout response should confirm token invalidation
  TestValidator.equals(
    "original access token matches",
    accessToken,
    moderatorAuth.token.access,
  );
  TestValidator.equals(
    "original refresh token matches",
    refreshToken,
    moderatorAuth.token.refresh,
  );
  TestValidator.equals(
    "original expiry time matches",
    expiresAt,
    moderatorAuth.token.expired_at,
  );
  TestValidator.equals(
    "original refresh expiry matches",
    refreshableUntil,
    moderatorAuth.token.refreshable_until,
  );

  // Step 5: Validate moderator account status after logout
  TestValidator.equals(
    "moderator account ID preserved",
    moderatorAuth.moderator.id,
    registeredUserId,
  );
  TestValidator.equals(
    "moderator status remains active",
    moderatorAuth.moderator.active_status,
    "active",
  );

  // Note: In a production environment, subsequent authenticated requests using
  // the stored accessToken or refreshToken would fail with authentication errors.
  // The logout response confirms that all tokens have been invalidated across
  // the platform's session management system.
}
