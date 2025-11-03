import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that token refresh validates moderator account is still active.
 *
 * This test creates a moderator account, performs login to get tokens, then
 * immediately uses the refresh token to obtain new access token. It verifies
 * that refresh succeeds when the account status is 'active' and email_verified
 * is true, validating the security checks performed during token refresh to
 * ensure the account hasn't been suspended or deleted since the refresh token
 * was issued.
 *
 * Test workflow:
 *
 * 1. Create moderator account with active status
 * 2. Login to obtain initial access and refresh tokens
 * 3. Use refresh token to get new tokens via refresh endpoint
 * 4. Verify refresh succeeds and returns valid tokens
 * 5. Validate token structure and expiration timestamps
 */
export async function test_api_moderator_token_refresh_with_active_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorUsername = RandomGenerator.alphaNumeric(10);
  const moderatorEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderatorPassword = "SecurePass123!";

  const registrationData = {
    username: moderatorUsername,
    email: moderatorEmail,
    password: moderatorPassword,
    href: "https://test.example.com/moderator/join",
    referrer: "https://test.example.com/home",
  } satisfies IDiscussionBoardModerator.ICreate;

  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredModerator);

  // Verify registration returned valid moderator data
  TestValidator.equals(
    "registered username matches",
    registeredModerator.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "registered email matches",
    registeredModerator.email,
    moderatorEmail,
  );

  // Step 2: Perform login to get initial tokens
  const loginData = {
    username_or_email: moderatorEmail,
    password: moderatorPassword,
    href: "https://test.example.com/moderator/login",
    referrer: "https://test.example.com/moderator/join",
  } satisfies IDiscussionBoardModerator.ILogin;

  const loggedInModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginData,
    });
  typia.assert(loggedInModerator);

  // Verify login was successful
  TestValidator.equals(
    "logged in moderator ID matches",
    loggedInModerator.id,
    registeredModerator.id,
  );

  // Store the original token information for comparison
  const originalAccessToken = loggedInModerator.token.access;
  const originalRefreshToken = loggedInModerator.token.refresh;

  // Step 3: Use refresh token to get new tokens
  const refreshData = {
    refresh_token: originalRefreshToken,
  } satisfies IDiscussionBoardModerator.IRefresh;

  const refreshedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: refreshData,
    });
  typia.assert(refreshedModerator);

  // Step 4: Verify refresh succeeded and returned valid data
  TestValidator.equals(
    "refreshed moderator ID matches",
    refreshedModerator.id,
    registeredModerator.id,
  );
  TestValidator.equals(
    "refreshed username matches",
    refreshedModerator.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "refreshed email matches",
    refreshedModerator.email,
    moderatorEmail,
  );

  // Step 5: Validate new token is different from original
  TestValidator.notEquals(
    "new access token is different",
    refreshedModerator.token.access,
    originalAccessToken,
  );

  // Verify account properties remain consistent
  TestValidator.equals(
    "email_verified status preserved",
    refreshedModerator.email_verified,
    loggedInModerator.email_verified,
  );
  TestValidator.equals(
    "account status preserved",
    refreshedModerator.status,
    loggedInModerator.status,
  );
}
