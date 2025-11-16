import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_token_refresh_session_remains_unchanged(
  connection: api.IConnection,
) {
  // Step 1: Create initial moderator login to establish session
  // Using fixed credentials for a test moderator that must exist in the system
  const loginRequest = {
    email: "moderator@test.example.com",
    password: "Test@1234",
    ip: "192.168.1.100",
    href: "https://example.com/moderator/login",
    referrer: "https://example.com/dashboard",
  } satisfies IDiscussionBoardModerator.ILogin;

  const initialAuthResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginRequest,
    });
  typia.assert(initialAuthResponse);

  // Capture initial session and token information
  const moderatorId: string = initialAuthResponse.id;
  const initialAccessToken: string = initialAuthResponse.token.access;
  const refreshToken: string = initialAuthResponse.token.refresh;
  const initialExpiredAt: string = initialAuthResponse.token.expired_at;
  const initialRefreshableUntil: string =
    initialAuthResponse.token.refreshable_until;

  // Verify initial tokens are valid
  TestValidator.predicate(
    "initial access token should not be empty",
    initialAccessToken.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token should not be empty",
    refreshToken.length > 0,
  );

  // Step 2: Perform token refresh using the refresh token
  const refreshResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IDiscussionBoardModerator.IRefresh,
    });
  typia.assert(refreshResponse);

  // Step 3: Verify new tokens are issued with updated expiration
  const newAccessToken: string = refreshResponse.token.access;
  const newRefreshToken: string = refreshResponse.token.refresh;
  const newExpiredAt: string = refreshResponse.token.expired_at;
  const newRefreshableUntil: string = refreshResponse.token.refreshable_until;

  // New access token should be different from initial (token rotation)
  TestValidator.notEquals(
    "new access token should differ from initial token",
    newAccessToken,
    initialAccessToken,
  );

  // New expiration should be later than initial (extended session)
  TestValidator.notEquals(
    "new expired_at should differ from initial",
    newExpiredAt,
    initialExpiredAt,
  );

  // Step 4: Verify moderator identity and session context remain unchanged
  // The moderator ID should be the same
  TestValidator.equals(
    "moderator id should remain same across token refresh",
    refreshResponse.id,
    moderatorId,
  );

  // Moderator display name should be consistent
  TestValidator.equals(
    "moderator display name should remain consistent",
    initialAuthResponse.moderator.display_name,
    refreshResponse.moderator.display_name,
  );

  // Account status should remain active
  TestValidator.equals(
    "moderator account status should remain active",
    refreshResponse.moderator.account_status,
    "active",
  );

  // Step 5: Verify session is still valid after refresh
  TestValidator.predicate(
    "moderator should have valid access token after refresh",
    newAccessToken.length > 0,
  );

  TestValidator.predicate(
    "new refresh token should be available for future refreshes",
    newRefreshToken.length > 0,
  );

  // Step 6: Verify token expiration times are valid and properly formatted
  TestValidator.predicate(
    "new expired_at should be valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(newExpiredAt),
  );

  TestValidator.predicate(
    "new refreshable_until should be valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(newRefreshableUntil),
  );

  // Step 7: Verify that refreshable_until is later than expired_at
  // (refresh token should live longer than access token)
  TestValidator.predicate(
    "refreshable_until should allow future token refreshes",
    new Date(newRefreshableUntil) > new Date(newExpiredAt),
  );
}
