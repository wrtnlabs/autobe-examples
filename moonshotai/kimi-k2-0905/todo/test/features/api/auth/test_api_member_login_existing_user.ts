import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { IMemberLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberLogin";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";

/**
 * Test successful member login with existing user credentials.
 *
 * This test validates the member authentication system by first registering a
 * new user account and then testing the login functionality with those valid
 * credentials. It ensures the authentication system properly validates members
 * and generates appropriate JWT tokens for accessing protected functionality.
 *
 * Step-by-step process:
 *
 * 1. Register a new member account with random email and valid password
 * 2. Verify registration response contains valid member details and authorization
 *    token
 * 3. Login with the same credentials used for registration
 * 4. Validate successful login returns proper member authorization data
 * 5. Compare login response with registration response to ensure consistency
 * 6. Verify the authorization token is properly set in connection headers
 */
export async function test_api_member_login_existing_user(
  connection: api.IConnection,
) {
  // Step 1: Register new member account with random credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // Generate secure password (12 characters > minimum 8)

  const registerBody = {
    email,
    password,
  } satisfies IMemberCreate.IRequest;

  // Step 2: Register the new member
  const registeredMember: ITodoMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registerBody,
    });
  typia.assert(registeredMember);

  // Step 3: Verify registration was successful with proper data
  TestValidator.equals(
    "registered member email matches input",
    registeredMember.email,
    email,
  );
  TestValidator.equals(
    "registered member role is member",
    registeredMember.role,
    "member",
  );
  TestValidator.predicate(
    "registration response has valid token structure",
    () =>
      registeredMember.token !== null &&
      registeredMember.token.access !== null &&
      registeredMember.token.refresh !== null &&
      registeredMember.token.access.length > 0 &&
      registeredMember.token.refresh.length > 0,
  );

  // Create unauthenticated connection for login test
  const loginConnection: api.IConnection = { ...connection, headers: {} };

  // Step 4: Login with the credentials used for registration
  const loginBody = {
    email,
    password,
  } satisfies IMemberLogin.IRequest;

  const loggedInMember: ITodoMember.IAuthorized =
    await api.functional.auth.member.login(loginConnection, {
      body: loginBody,
    });
  typia.assert(loggedInMember);

  // Step 5: Verify login was successful with proper data
  TestValidator.equals(
    "logged in member email matches input",
    loggedInMember.email,
    email,
  );
  TestValidator.equals(
    "logged in member role is member",
    loggedInMember.role,
    "member",
  );
  TestValidator.predicate(
    "login response has valid token structure",
    () =>
      loggedInMember.token !== null &&
      loggedInMember.token.access !== null &&
      loggedInMember.token.refresh !== null &&
      loggedInMember.token.access.length > 0 &&
      loggedInMember.token.refresh.length > 0,
  );

  // Step 6: Compare the responses to ensure consistency
  TestValidator.equals(
    "member IDs match between registration and login",
    loggedInMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "member roles match between registration and login",
    loggedInMember.role,
    registeredMember.role,
  );
  TestValidator.equals(
    "member emails match between registration and login",
    loggedInMember.email,
    registeredMember.email,
  );

  // Step 7: Verify token data validity
  const tokenValidation = typia.validate<IAuthorizationToken>(
    loggedInMember.token,
  );
  TestValidator.equals(
    "token validation succeeds",
    tokenValidation.success,
    true,
  );

  TestValidator.predicate(
    "access token has valid length",
    () => loggedInMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token has valid length",
    () => loggedInMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration is in future",
    () => new Date(loggedInMember.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    () =>
      new Date(loggedInMember.token.refreshable_until).getTime() > Date.now(),
  );

  // Step 8: Verify connection authorization header was set after login
  TestValidator.predicate(
    "connection authorization header is set after login",
    () =>
      loginConnection.headers?.Authorization === loggedInMember.token.access,
  );

  // Step 9: Validate last_login_at field behavior
  TestValidator.predicate(
    "last_login_at is optional field",
    () =>
      loggedInMember.last_login_at === null ||
      loggedInMember.last_login_at === undefined ||
      (loggedInMember.last_login_at !== null &&
        typeof loggedInMember.last_login_at === "string"),
  );
}
