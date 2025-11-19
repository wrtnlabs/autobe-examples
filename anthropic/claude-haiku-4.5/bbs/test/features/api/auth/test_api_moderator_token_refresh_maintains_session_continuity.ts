import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test token refresh functionality for moderators to maintain session
 * continuity.
 *
 * This test validates that a moderator can refresh their access token using a
 * valid refresh token obtained during initial authentication. The refresh
 * operation should issue a new access token that extends the session lifetime
 * without requiring the moderator to re-enter their credentials.
 *
 * Test flow:
 *
 * 1. Generate random refresh token from a prior authentication
 * 2. Call the token refresh endpoint with the refresh token
 * 3. Verify the refresh operation returns a new access token and updated token
 *    metadata
 * 4. Validate that the new access token has a valid format and future expiration
 *    time
 * 5. Confirm the response includes proper moderator information with the new token
 */
export async function test_api_moderator_token_refresh_maintains_session_continuity(
  connection: api.IConnection,
) {
  // Generate a random refresh token that would have been issued during prior login
  const refreshToken = typia.random<string>();

  // Call the token refresh endpoint with the refresh token
  const refreshedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IDiscussionBoardModerator.IRefresh,
    });

  // Validate the response structure and content
  typia.assert(refreshedModerator);

  // Verify that a new access token was issued
  TestValidator.predicate(
    "new access token should be issued",
    refreshedModerator.token.access.length > 0,
  );

  // Verify that the new access token has a valid expiration timestamp
  TestValidator.predicate(
    "access token expiration should be in the future",
    new Date(refreshedModerator.token.expired_at) > new Date(),
  );

  // Verify that the refresh token remains valid for future refreshes
  TestValidator.predicate(
    "refresh token should remain valid",
    refreshedModerator.token.refresh.length > 0,
  );

  // Verify that the refresh token has a valid expiration timestamp
  TestValidator.predicate(
    "refresh token expiration should be in the future",
    new Date(refreshedModerator.token.refreshable_until) > new Date(),
  );

  // Verify moderator account status is active (required for token refresh)
  TestValidator.equals(
    "moderator account should be active",
    refreshedModerator.account_status,
    "active",
  );

  // Verify email is verified (required for token refresh)
  TestValidator.predicate(
    "moderator email should be verified",
    refreshedModerator.email_verified === true,
  );

  // Verify moderator has valid moderation tier
  TestValidator.equals(
    "moderator should have full tier",
    refreshedModerator.moderation_tier,
    "full",
  );

  // Verify the moderator ID is a valid UUID
  TestValidator.predicate(
    "moderator ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      refreshedModerator.id,
    ),
  );
}
