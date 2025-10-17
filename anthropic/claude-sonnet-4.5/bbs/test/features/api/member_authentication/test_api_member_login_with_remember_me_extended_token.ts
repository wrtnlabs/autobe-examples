import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member login and token expiration validation.
 *
 * This test validates that when a member logs in, the system issues both access
 * and refresh tokens with appropriate expiration times. The test verifies the
 * token structure and validates that expiration timestamps are set correctly.
 *
 * Note: The original scenario requested testing Remember Me functionality, but
 * the API does not provide a Remember Me parameter in the login request. This
 * test has been adapted to validate standard login token behavior instead.
 *
 * Steps:
 *
 * 1. Register a new member account
 * 2. Log in with the registered credentials
 * 3. Verify authentication success and token issuance
 * 4. Validate access token expiration is approximately 30 minutes
 * 5. Validate refresh token expiration is set to a future time
 */
export async function test_api_member_login_with_remember_me_extended_token(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const registerData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registerData,
    });
  typia.assert(registeredMember);

  // Step 2: Log in with the registered credentials
  const loginData = {
    email: registerData.email,
    password: registerData.password,
  } satisfies IDiscussionBoardMember.ILogin;

  const loginResult: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginData,
    });
  typia.assert(loginResult);

  // Step 3: Verify authentication success
  TestValidator.equals(
    "logged in member ID matches registered member ID",
    loginResult.id,
    registeredMember.id,
  );

  // Verify token structure
  typia.assert<IAuthorizationToken>(loginResult.token);

  // Step 4: Validate access token expiration (30 minutes)
  const accessTokenExpiration = new Date(loginResult.token.expired_at);
  const loginTime = new Date();
  const accessTokenDuration =
    accessTokenExpiration.getTime() - loginTime.getTime();
  const expectedAccessDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
  const accessTokenTolerance = 5 * 60 * 1000; // 5 minutes tolerance

  TestValidator.predicate(
    "access token expires in approximately 30 minutes",
    Math.abs(accessTokenDuration - expectedAccessDuration) <
      accessTokenTolerance,
  );

  // Step 5: Validate refresh token expiration is in the future
  const refreshTokenExpiration = new Date(loginResult.token.refreshable_until);

  TestValidator.predicate(
    "refresh token expiration is set to a future time",
    refreshTokenExpiration.getTime() > loginTime.getTime(),
  );

  // Verify tokens are not empty strings
  TestValidator.predicate(
    "access token is not empty",
    loginResult.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is not empty",
    loginResult.token.refresh.length > 0,
  );
}
