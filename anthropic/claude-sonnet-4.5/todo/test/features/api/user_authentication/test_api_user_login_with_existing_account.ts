import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test complete user authentication workflow with existing account login.
 *
 * Validates the end-to-end user login process where an existing user
 * authenticates with their registered email and password. This test ensures
 * that the authentication system properly validates credentials, creates
 * session records, generates JWT tokens, and returns complete user profile
 * information.
 *
 * Process:
 *
 * 1. Register a new user account with valid credentials
 * 2. Authenticate using the registered email and password
 * 3. Validate JWT tokens are generated (access and refresh)
 * 4. Verify session establishment with proper context
 * 5. Confirm user profile data matches registration
 */
export async function test_api_user_login_with_existing_account(
  connection: api.IConnection,
) {
  // Phase 1: Register a test user account
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(12); // Ensure >= 8 chars with mixed content

  const registrationBody = {
    email: testEmail,
    password: testPassword,
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.IRegister;

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredUser);

  // Validate registration was successful
  TestValidator.equals(
    "registered email matches input",
    registeredUser.email,
    testEmail,
  );
  TestValidator.predicate(
    "registered user has valid UUID",
    registeredUser.id.length === 36,
  );
  TestValidator.predicate(
    "access token is present",
    registeredUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    registeredUser.token.refresh.length > 0,
  );

  // Phase 2: Login with the registered credentials
  const loginBody = {
    email: testEmail,
    password: testPassword,
    ip: "192.168.1.101",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ILogin;

  const authenticatedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginBody,
    });
  typia.assert(authenticatedUser);

  // Phase 3: Validate login response
  TestValidator.equals(
    "authenticated user ID matches registered user",
    authenticatedUser.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "authenticated email matches registered email",
    authenticatedUser.email,
    testEmail,
  );
  TestValidator.predicate(
    "login access token is present",
    authenticatedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token is present",
    authenticatedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is set",
    authenticatedUser.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshable_until is set",
    authenticatedUser.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    authenticatedUser.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    authenticatedUser.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    authenticatedUser.deleted_at,
    null,
  );
}
