import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that last_login_at timestamp is updated upon successful login.
 *
 * Validates that the last_login_at field is properly tracked and updated
 * whenever a user successfully authenticates. This test ensures the system
 * maintains accurate login history for user activity tracking and security
 * monitoring.
 *
 * Test workflow:
 *
 * 1. Create a new user account via registration endpoint
 * 2. Verify that newly created user has last_login_at as null (no login yet)
 * 3. Perform first login with the registered credentials
 * 4. Verify that last_login_at is now set to the login timestamp
 * 5. Wait a brief period to ensure timestamp difference
 * 6. Perform second login with the same credentials
 * 7. Verify that last_login_at is updated to the new login timestamp
 * 8. Confirm that the second login timestamp is later than the first
 */
export async function test_api_user_login_last_login_at_update(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12); // Password must be at least 8 characters

  const registrationResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: email,
        password: password,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registrationResponse);

  // Step 2: Verify newly registered user has null last_login_at
  const newUser = registrationResponse;
  TestValidator.equals(
    "newly registered user should have null last_login_at",
    newUser.last_login_at,
    null,
  );

  // Step 3: Perform first login
  const firstLoginResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: email,
        password: password,
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(firstLoginResponse);

  // Step 4: Verify last_login_at is updated after first login
  TestValidator.predicate(
    "first login should update last_login_at to non-null value",
    firstLoginResponse.last_login_at !== null,
  );

  const firstLoginTimestamp = firstLoginResponse.last_login_at;
  TestValidator.predicate(
    "first login timestamp should be in valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstLoginTimestamp!),
  );

  // Step 5: Wait a brief period (100ms) to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 6: Perform second login
  const secondLoginResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: email,
        password: password,
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(secondLoginResponse);

  // Step 7: Verify last_login_at is updated after second login
  TestValidator.predicate(
    "second login should update last_login_at to non-null value",
    secondLoginResponse.last_login_at !== null,
  );

  const secondLoginTimestamp = secondLoginResponse.last_login_at;
  TestValidator.predicate(
    "second login timestamp should be in valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(secondLoginTimestamp!),
  );

  // Step 8: Verify second login timestamp is later than first
  TestValidator.predicate(
    "second login timestamp should be after first login timestamp",
    new Date(secondLoginTimestamp!).getTime() >=
      new Date(firstLoginTimestamp!).getTime(),
  );
}
