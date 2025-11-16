import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";

/**
 * Test successful member login with valid credentials.
 *
 * This test validates that existing members can authenticate using their email
 * and password to receive access/refresh tokens and profile information. It
 * follows the complete authentication flow from account creation to successful
 * login, verifying that members receive proper authentication credentials for
 * session management and can access their profile data immediately after
 * login.
 *
 * Test Steps:
 *
 * 1. Create a new member account using valid registration data
 * 2. Extract the validated member profile from registration response
 * 3. Use the same email and password to authenticate via login endpoint
 * 4. Verify successful authentication returns member data
 * 5. Validate authentication tokens are properly generated
 * 6. Confirm response contains all required authentication properties
 *
 * The test ensures that:
 *
 * - Login accepts valid email/password combinations
 * - Authentication returns complete member profile data
 * - Access and refresh tokens are properly issued
 * - Member data matches the created account information
 * - All authentication response properties are present and valid
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
) {
  // Generate random test data for member registration
  const username = RandomGenerator.name();
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  // Step 1: Create member account first
  const joinResponse = await api.functional.auth.member.join(connection, {
    body: {
      username: username satisfies string &
        tags.Pattern<"^[a-zA-Z0-9_-]{3,30}$">,
      email: email,
      password: password,
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(joinResponse);

  // Extract member data from registration for comparison
  const createdMember = joinResponse.member;

  // Step 2: Login with the created member credentials
  const loginResponse = await api.functional.auth.member.login(connection, {
    body: {
      email: email,
      password_hash: password,
    } satisfies IEconomicDiscussionMember.ILogin,
  });
  typia.assert(loginResponse);

  // Step 3: Validate authentication success and data integrity
  TestValidator.equals(
    "authenticated member username matches",
    loginResponse.member.username,
    createdMember.username,
  );
  TestValidator.equals(
    "authenticated member email matches",
    loginResponse.member.email,
    createdMember.email,
  );
  TestValidator.equals(
    "authenticated member ID matches",
    loginResponse.member.id,
    createdMember.id,
  );

  // Step 4: Verify authentication tokens are present and valid
  TestValidator.predicate(
    "access token is present",
    loginResponse.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    loginResponse.refresh_token.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is positive",
    loginResponse.expires_in > 0,
  );

  // Step 5: Validate token structure
  TestValidator.predicate(
    "token structure is complete",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "token access is valid",
    loginResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refresh is valid",
    loginResponse.token.refreshable_until.length > 0,
  );

  // Step 6: Verify member profile data structure
  TestValidator.predicate(
    "member has valid ID",
    typia.is<string & tags.Format<"uuid">>(loginResponse.member.id),
  );
  TestValidator.predicate(
    "member has valid email",
    typia.is<string & tags.Format<"email">>(loginResponse.member.email),
  );
  TestValidator.predicate(
    "member has valid username",
    loginResponse.member.username.length >= 3 &&
      loginResponse.member.username.length <= 50,
  );
}
