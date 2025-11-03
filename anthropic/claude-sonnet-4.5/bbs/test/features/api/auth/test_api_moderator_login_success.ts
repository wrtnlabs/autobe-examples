import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful moderator authentication workflow.
 *
 * This test validates the complete moderator login process from account
 * creation through successful authentication. It verifies that moderators can
 * log in with their credentials and receive valid JWT tokens with proper
 * expiration times.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account using join operation with valid credentials
 * 2. Perform login using the created moderator's username and password
 * 3. Verify login succeeds and returns complete moderator profile
 * 4. Validate JWT access and refresh tokens are present
 * 5. Verify token expiration times (30-minute access, 30-day refresh)
 * 6. Confirm last_login_at timestamp is updated
 * 7. Test alternative login with email instead of username
 */
export async function test_api_moderator_login_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);
  const moderatorPassword = "SecurePass123!@#";
  const currentHref = "https://discussion-board.example.com/auth/join";
  const currentReferrer = "https://discussion-board.example.com/";

  const joinBody = {
    username: moderatorUsername,
    email: moderatorEmail,
    password: moderatorPassword,
    href: currentHref,
    referrer: currentReferrer,
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinBody,
    });
  typia.assert(createdModerator);

  // Step 2: Login using username and password
  const loginHref = "https://discussion-board.example.com/auth/login";
  const loginReferrer = "https://discussion-board.example.com/dashboard";

  const loginWithUsernameBody = {
    username_or_email: moderatorUsername,
    password: moderatorPassword,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies IDiscussionBoardModerator.ILogin;

  const loginWithUsernameResult: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginWithUsernameBody,
    });
  typia.assert(loginWithUsernameResult);

  // Step 3: Verify moderator profile information matches
  TestValidator.equals(
    "logged in moderator ID matches created moderator",
    loginWithUsernameResult.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "logged in moderator username matches",
    loginWithUsernameResult.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "logged in moderator email matches",
    loginWithUsernameResult.email,
    moderatorEmail,
  );

  // Step 4: Validate JWT tokens are present
  TestValidator.predicate(
    "access token is present",
    loginWithUsernameResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    loginWithUsernameResult.token.refresh.length > 0,
  );

  // Step 5: Verify token expiration times
  const loginTime = new Date();
  const accessExpiration = new Date(loginWithUsernameResult.token.expired_at);
  const refreshExpiration = new Date(
    loginWithUsernameResult.token.refreshable_until,
  );

  const accessTokenDurationMinutes = Math.round(
    (accessExpiration.getTime() - loginTime.getTime()) / (1000 * 60),
  );
  const refreshTokenDurationDays = Math.round(
    (refreshExpiration.getTime() - loginTime.getTime()) / (1000 * 60 * 60 * 24),
  );

  TestValidator.predicate(
    "access token expires in approximately 30 minutes",
    Math.abs(accessTokenDurationMinutes - 30) <= 2,
  );
  TestValidator.predicate(
    "refresh token expires in approximately 30 days",
    Math.abs(refreshTokenDurationDays - 30) <= 1,
  );

  // Step 6: Confirm last_login_at timestamp is updated
  TestValidator.predicate(
    "last_login_at timestamp is set",
    loginWithUsernameResult.last_login_at !== null &&
      loginWithUsernameResult.last_login_at !== undefined,
  );

  typia.assertGuard(loginWithUsernameResult.last_login_at!);
  const lastLoginTime = new Date(loginWithUsernameResult.last_login_at);
  const timeDifference = Math.abs(
    lastLoginTime.getTime() - loginTime.getTime(),
  );
  TestValidator.predicate(
    "last_login_at timestamp is recent",
    timeDifference < 5000,
  );

  // Step 7: Test alternative login with email instead of username
  const loginWithEmailBody = {
    username_or_email: moderatorEmail,
    password: moderatorPassword,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies IDiscussionBoardModerator.ILogin;

  const loginWithEmailResult: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginWithEmailBody,
    });
  typia.assert(loginWithEmailResult);

  TestValidator.equals(
    "login with email returns same moderator ID",
    loginWithEmailResult.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "login with email returns same username",
    loginWithEmailResult.username,
    moderatorUsername,
  );
  TestValidator.predicate(
    "login with email provides valid access token",
    loginWithEmailResult.token.access.length > 0,
  );
}
