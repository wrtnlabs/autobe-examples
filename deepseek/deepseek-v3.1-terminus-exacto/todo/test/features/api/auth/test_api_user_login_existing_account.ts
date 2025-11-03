import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful user authentication workflow for existing Todo application
 * accounts.
 *
 * This test validates that registered users can authenticate with correct email
 * and password credentials. It verifies that login creates proper session
 * records with IP address, connection URL, and referrer information, generates
 * valid JWT tokens, and ensures only active user accounts can authenticate
 * successfully.
 *
 * Implementation Steps:
 *
 * 1. Create a user account using the join endpoint as prerequisite
 * 2. Test successful login with correct credentials including session context
 * 3. Validate authentication response contains proper user information and JWT
 *    tokens
 * 4. Verify token structure and expiration handling
 * 5. Ensure user status is 'active' as required for authentication
 */
export async function test_api_user_login_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Create a user account for login testing (dependency)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(registeredUser);

  // Step 2: Test successful login with session context information
  const loginResponse = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      ip: "192.168.1.100",
      href: "https://todoapp.example.com/login",
      referrer: "https://todoapp.example.com/",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginResponse);

  // Step 3: Validate authentication response structure
  TestValidator.equals(
    "user ID matches registered user",
    loginResponse.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "user email matches login credentials",
    loginResponse.email,
    userEmail,
  );
  TestValidator.equals(
    "user status should be active",
    loginResponse.status,
    "active",
  );

  // Step 4: Validate token structure and expiration
  TestValidator.predicate(
    "access token should be present",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    loginResponse.token.refresh.length > 0,
  );

  const expiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "token expiration should be in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refreshable until should be in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable until should be after token expiration",
    refreshableUntil > expiredAt,
  );

  // Step 5: Verify timestamps are properly set
  TestValidator.predicate(
    "created_at timestamp should be valid",
    new Date(loginResponse.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "updated_at timestamp should be valid",
    new Date(loginResponse.updated_at) <= new Date(),
  );
  TestValidator.predicate(
    "updated_at should be after or equal to created_at",
    new Date(loginResponse.updated_at) >= new Date(loginResponse.created_at),
  );
}
