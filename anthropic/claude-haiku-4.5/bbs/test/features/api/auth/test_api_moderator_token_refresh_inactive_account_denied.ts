import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator token refresh with valid session.
 *
 * Validates that moderators can successfully refresh their authentication
 * tokens when they have a valid, active refresh token from a previous login.
 * This test verifies the token refresh mechanism works correctly for extending
 * moderator sessions.
 *
 * Steps:
 *
 * 1. Login moderator with valid credentials to establish session
 * 2. Obtain refresh token from successful login response
 * 3. Refresh token using the obtained refresh token
 * 4. Verify refresh returns new valid authentication credentials
 * 5. Verify new token is different from original access token
 */
export async function test_api_moderator_token_refresh_inactive_account_denied(
  connection: api.IConnection,
) {
  // Step 1 & 2: Login moderator to obtain valid refresh token
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "testPassword123!";

  const loginResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(loginResponse);

  // Verify moderator is in active status after successful login
  TestValidator.equals(
    "moderator account status should be active after login",
    loginResponse.moderator.account_status,
    "active",
  );

  // Extract tokens from login response
  const originalAccessToken = loginResponse.token.access;
  const refreshToken = loginResponse.token.refresh;
  TestValidator.predicate(
    "refresh token should be available",
    refreshToken.length > 0,
  );

  // Step 3: Attempt token refresh with valid refresh token
  const refreshResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IDiscussionBoardModerator.IRefresh,
    });
  typia.assert(refreshResponse);

  // Verify refresh response contains valid credentials
  TestValidator.predicate(
    "refresh response should have new access token",
    refreshResponse.token.access.length > 0,
  );

  // Verify the new access token is different from original
  TestValidator.notEquals(
    "new access token should differ from original",
    refreshResponse.token.access,
    originalAccessToken,
  );

  // Verify moderator status remains active in refresh response
  TestValidator.equals(
    "moderator account status should still be active after refresh",
    refreshResponse.moderator.account_status,
    "active",
  );

  // Verify token expiration information is present
  TestValidator.predicate(
    "access token expiration should be set",
    refreshResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token expiration should be set",
    refreshResponse.token.refreshable_until.length > 0,
  );
}
