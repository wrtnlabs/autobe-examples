import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that login response has correct structure with all required fields.
 *
 * Performs successful login and validates response contains:
 *
 * - Id (user UUID)
 * - Email (user email)
 * - Created_at (ISO 8601 timestamp)
 * - Updated_at (ISO 8601 timestamp)
 * - Deleted_at (null for active accounts)
 * - Last_login_at (login timestamp)
 * - User object (complete user profile)
 * - Token object (access, refresh, expired_at, refreshable_until)
 *
 * All fields are verified to be present and properly formatted through
 * typia.assert which performs complete type and format validation.
 *
 * Process:
 *
 * 1. Create a new user via registration
 * 2. Login with the created user credentials
 * 3. Validate response structure and all required fields
 * 4. Verify account state and token availability
 */
export async function test_api_user_login_response_structure(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for testing login
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);

  const registrationResponse = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registrationResponse);

  // Step 2: Create new connection for fresh login (without auth token from registration)
  const loginConnection: api.IConnection = { ...connection, headers: {} };

  // Step 3: Login with the created user's credentials
  const loginResponse = await api.functional.auth.user.login(loginConnection, {
    body: {
      email,
      password,
    } satisfies ITodoListUser.ILogin,
  });

  // Step 4: Validate complete response structure with type assertion
  // typia.assert performs comprehensive validation of all types and formats
  typia.assert(loginResponse);

  // Step 5: Validate user identification matches request
  TestValidator.equals(
    "login response email matches request email",
    loginResponse.email,
    email,
  );

  // Step 6: Validate deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    loginResponse.deleted_at,
    null,
  );

  // Step 7: Validate last_login_at is set after successful login
  TestValidator.predicate(
    "last_login_at is set after successful login",
    loginResponse.last_login_at !== null,
  );

  // Step 8: Validate user object exists and contains consistent data
  if (loginResponse.user) {
    TestValidator.equals(
      "user object id matches response id",
      loginResponse.user.id,
      loginResponse.id,
    );
    TestValidator.equals(
      "user object email matches response email",
      loginResponse.user.email,
      loginResponse.email,
    );
  }
}
