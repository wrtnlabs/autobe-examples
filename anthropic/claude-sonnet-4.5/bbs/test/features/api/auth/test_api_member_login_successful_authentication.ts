import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member login authentication workflow.
 *
 * This test validates the complete authentication flow for a registered member
 * logging in with valid credentials. The test ensures that:
 *
 * 1. A member can be successfully registered with valid credentials
 * 2. The registered member can authenticate using email and password
 * 3. The authentication returns proper JWT tokens (access and refresh)
 * 4. Token expiration times are correctly set according to business rules
 * 5. The member ID is properly returned in the authorization response
 *
 * The test follows the complete user journey from registration through
 * successful authentication, validating that the system correctly handles
 * credential validation, session creation, and token issuance.
 */
export async function test_api_member_login_successful_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const registrationData = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  typia.assert(registeredMember);

  // Step 2: Perform login with the registered credentials
  const loginData = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IDiscussionBoardMember.ILogin;

  const loginResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginData,
    });

  typia.assert(loginResponse);

  // Step 3: Validate token expiration timing
  const now = new Date();
  const expiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);

  const accessTokenDuration = expiredAt.getTime() - now.getTime();
  const refreshTokenDuration = refreshableUntil.getTime() - now.getTime();

  // Access token should expire in approximately 30 minutes (allowing 1 minute tolerance)
  const expectedAccessDuration = 30 * 60 * 1000;
  const accessTokenTolerance = 60 * 1000;

  TestValidator.predicate(
    "access token should expire in approximately 30 minutes",
    Math.abs(accessTokenDuration - expectedAccessDuration) <
      accessTokenTolerance,
  );

  // Refresh token should expire in approximately 7 days (allowing 1 hour tolerance)
  const expectedRefreshDuration = 7 * 24 * 60 * 60 * 1000;
  const refreshTokenTolerance = 60 * 60 * 1000;

  TestValidator.predicate(
    "refresh token should expire in approximately 7 days",
    Math.abs(refreshTokenDuration - expectedRefreshDuration) <
      refreshTokenTolerance,
  );

  // Step 4: Verify that login and registration return different token instances
  TestValidator.predicate(
    "login should create new tokens different from registration",
    loginResponse.token.access !== registeredMember.token.access,
  );
}
