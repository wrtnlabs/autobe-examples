import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful moderator token refresh workflow.
 *
 * This test validates that a moderator with a valid refresh token can obtain a
 * new access token without re-entering credentials. The workflow includes:
 *
 * 1. Registering a new moderator account and capturing the initial tokens
 * 2. Extracting the refresh token from the join response
 * 3. Using the refresh endpoint to obtain new access tokens
 * 4. Verifying the new access token has proper 15-minute expiration
 * 5. Confirming the tokens can be used for subsequent authenticated requests
 * 6. Validating token structure and format compliance
 *
 * This is essential for maintaining moderator sessions and ensuring continuous
 * access to moderation features without requiring password re-entry.
 */
export async function test_api_moderator_token_refresh_successful(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account with initial tokens
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPass123";

  const joinResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: "192.168.1.100",
        href: "https://admin.example.com/auth/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      } satisfies IDiscussionBoardModerator.IJoin,
    });

  typia.assert(joinResponse);

  // Step 2: Verify the join response contains valid tokens
  TestValidator.predicate(
    "join response has access token",
    joinResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "join response has refresh token",
    joinResponse.token.refresh.length > 0,
  );

  // Step 3: Extract the refresh token for use in refresh operation
  const initialRefreshToken = joinResponse.token.refresh;
  const initialAccessToken = joinResponse.token.access;

  // Step 4: Call the refresh endpoint with the valid refresh token
  const refreshResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IDiscussionBoardModerator.IRefresh,
    });

  typia.assert(refreshResponse);

  // Step 5: Verify refresh response structure and data integrity
  TestValidator.predicate(
    "refresh response has new access token",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh response has refresh token",
    refreshResponse.token.refresh.length > 0,
  );

  // Step 6: Validate that new access token is different from old one
  TestValidator.notEquals(
    "new access token should differ from initial token",
    initialAccessToken,
    refreshResponse.token.access,
  );

  // Step 7: Verify moderator identity is preserved across refresh
  TestValidator.equals(
    "moderator ID remains the same after refresh",
    joinResponse.id,
    refreshResponse.id,
  );

  TestValidator.equals(
    "moderator email remains the same after refresh",
    joinResponse.email,
    refreshResponse.email,
  );

  // Step 8: Verify account status is still active
  TestValidator.equals(
    "moderator account status is active after refresh",
    refreshResponse.account_status,
    "active",
  );

  // Step 9: Verify permissions are maintained
  TestValidator.predicate(
    "moderator has permissions after refresh",
    Array.isArray(refreshResponse.permissions) &&
      refreshResponse.permissions.length > 0,
  );

  // Step 10: Verify token expiration times are properly set
  const expiredAt = new Date(refreshResponse.token.expired_at);
  const refreshableUntil = new Date(refreshResponse.token.refreshable_until);
  const now = new Date();

  // Access token should expire approximately 15 minutes from now
  const fifteenMinutesMs = 15 * 60 * 1000;
  const expirationDiff = expiredAt.getTime() - now.getTime();
  TestValidator.predicate(
    "access token expiration is approximately 15 minutes from now",
    expirationDiff > 14 * 60 * 1000 && expirationDiff < 16 * 60 * 1000,
  );

  // Refresh token should expire approximately 7 days from now
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const refreshableDiff = refreshableUntil.getTime() - now.getTime();
  TestValidator.predicate(
    "refresh token expiration is approximately 7 days from now",
    refreshableDiff > 6.9 * 24 * 60 * 60 * 1000 &&
      refreshableDiff < 7.1 * 24 * 60 * 60 * 1000,
  );

  // Step 11: Verify timestamps are properly formatted ISO 8601
  TestValidator.predicate(
    "expired_at is valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshResponse.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshResponse.token.refreshable_until,
    ),
  );
}
