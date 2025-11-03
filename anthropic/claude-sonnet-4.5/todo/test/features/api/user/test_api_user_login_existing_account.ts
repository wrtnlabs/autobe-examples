import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the user authentication workflow for existing users logging into their
 * Todo list account.
 *
 * This test validates the complete login process starting with a registered
 * user account. First, create a new user account through registration to
 * establish an existing user in the system. Then, authenticate that user by
 * providing the same email and password credentials used during registration.
 *
 * The test verifies that the system:
 *
 * 1. Creates a new user account successfully
 * 2. Authenticates the user with valid credentials
 * 3. Generates JWT access and refresh tokens
 * 4. Returns user profile information
 * 5. Provides valid authorization tokens for subsequent API requests
 */
export async function test_api_user_login_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account through registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = `${RandomGenerator.alphabets(5)}${typia.random<number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<999>>()}`;
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const registeredUser: ITodoListUser =
    await api.functional.todoList.users.join(connection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Authenticate the user with the same credentials
  const loginResult: ITodoListUser.IAuthorization =
    await api.functional.todoList.users.login(connection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(loginResult);

  // Step 3: Validate the authentication response contains expected data
  TestValidator.equals(
    "login email matches registration email",
    loginResult.email,
    email,
  );

  TestValidator.equals(
    "login user ID matches registered user ID",
    loginResult.id,
    registeredUser.id,
  );

  // Step 4: Validate token structure
  typia.assert<IAuthorizationToken>(loginResult.token);

  // Step 5: Verify access token exists and is a non-empty string
  TestValidator.predicate(
    "access token should be a non-empty string",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );

  // Step 6: Verify refresh token exists and is a non-empty string
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );

  // Step 7: Verify token expiration timestamps are valid dates
  TestValidator.predicate(
    "access token expiration should be a valid future date",
    new Date(loginResult.token.expired_at).getTime() > Date.now(),
  );

  TestValidator.predicate(
    "refresh token expiration should be a valid future date",
    new Date(loginResult.token.refreshable_until).getTime() > Date.now(),
  );

  // Step 8: Verify refresh token has longer expiration than access token
  TestValidator.predicate(
    "refresh token should expire after access token",
    new Date(loginResult.token.refreshable_until).getTime() >
      new Date(loginResult.token.expired_at).getTime(),
  );
}
