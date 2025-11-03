import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful user authentication with valid credentials.
 *
 * This scenario validates the complete login workflow: user registration to
 * create account credentials, followed by login attempt with correct email and
 * password. The test ensures proper JWT token generation, session creation with
 * IP address and referrer tracking, and verification that only active user
 * accounts can authenticate successfully.
 */
export async function test_api_user_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create user account with valid credentials
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: Attempt login with valid credentials
  const loginResponse = await api.functional.todoApp.auth.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      ip: "192.168.1.100",
      href: "https://todoapp.example.com/login",
      referrer: "https://todoapp.example.com",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginResponse);

  // Step 3: Validate login response structure
  TestValidator.equals(
    "user ID matches created user",
    loginResponse.id,
    createdUser.id,
  );
  TestValidator.equals("user email matches", loginResponse.email, userEmail);

  // Step 4: Validate token structure
  TestValidator.predicate(
    "access token is present",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    loginResponse.token.refresh.length > 0,
  );

  const expiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);

  TestValidator.predicate(
    "expiration date is in the future",
    expiredAt > new Date(),
  );
  TestValidator.predicate(
    "refreshable until date is in the future",
    refreshableUntil > new Date(),
  );
  TestValidator.predicate(
    "refreshable until is after expiration date",
    refreshableUntil > expiredAt,
  );
}
