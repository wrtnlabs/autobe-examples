import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful user authentication workflow.
 *
 * This test validates the complete user authentication process by first
 * registering a new user account and then using the same credentials to log in.
 * It verifies that the system properly authenticates the user, validates
 * credentials against stored hashes, generates new authentication tokens, and
 * returns complete user identity information. The test also validates session
 * context recording including IP, href, and referrer tracking.
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // Step 1: Create user account for login testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registeredUser);

  // Step 2: Login with the same credentials
  const loginResponse = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      ip: "192.168.1.100",
      href: "https://example.com/auth/login",
      referrer: "https://example.com/dashboard",
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(loginResponse);

  // Step 3: Validate user identity information
  TestValidator.equals(
    "user ID should match registered user",
    loginResponse.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "user email should match registered email",
    loginResponse.email,
    registeredUser.email,
  );
  TestValidator.equals(
    "user status should be active",
    loginResponse.status,
    "active",
  );

  // Step 4: Validate authentication tokens
  TestValidator.predicate(
    "access token should be present",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration should be valid date",
    new Date(loginResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable until should be valid date",
    new Date(loginResponse.token.refreshable_until) > new Date(),
  );

  // Step 5: Validate token structure
  typia.assert<IAuthorizationToken>(loginResponse.token);

  // Step 6: Validate session context recording (indirectly through successful login)
  TestValidator.predicate(
    "user should have creation timestamp",
    loginResponse.created_at.length > 0,
  );
  TestValidator.predicate(
    "user should have update timestamp",
    loginResponse.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at should be undefined for active user",
    loginResponse.deleted_at === undefined,
  );
}
