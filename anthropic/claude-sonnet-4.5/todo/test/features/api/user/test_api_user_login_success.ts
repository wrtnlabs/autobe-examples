import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful user authentication workflow with valid credentials.
 *
 * This test validates the complete login process for an existing user account.
 * First, a new user is registered to establish known credentials in the system.
 * Then, the same credentials are used to perform a login operation, verifying
 * that the authentication system correctly validates the email and password,
 * creates a new session, and returns complete user information with JWT
 * tokens.
 *
 * The test ensures:
 *
 * 1. User registration creates a valid account
 * 2. Login with correct credentials succeeds
 * 3. Response contains complete authenticated user information
 * 4. JWT tokens are generated with proper expiration details
 * 5. All data types and formats are correct
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // Step 1: Create a new user account for testing login
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = typia.random<string & tags.MinLength<8>>();
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();

  const registrationData = {
    email: testEmail,
    password: testPassword,
    href: testHref,
    referrer: testReferrer,
  } satisfies ITodoListUser.ICreate;

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredUser);

  // Step 2: Perform login with the same credentials
  const loginData = {
    email: testEmail,
    password: testPassword,
    href: testHref,
    referrer: testReferrer,
  } satisfies ITodoListUser.ILogin;

  const authenticatedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginData,
    });
  typia.assert(authenticatedUser);

  // Step 3: Validate the authentication response - business logic only
  TestValidator.equals(
    "authenticated user email matches registered email",
    authenticatedUser.email,
    testEmail,
  );

  TestValidator.equals(
    "authenticated user ID matches registered user ID",
    authenticatedUser.id,
    registeredUser.id,
  );
}
