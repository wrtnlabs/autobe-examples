import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test that successful admin login updates the last_active_at timestamp.
 *
 * Verifies that when an admin successfully logs in, their last_active_at field
 * is updated to the current timestamp, enabling monitoring of admin account
 * activity and identifying inactive accounts.
 *
 * Steps:
 *
 * 1. Generate test admin credentials
 * 2. Record the time before login attempt
 * 3. Authenticate the admin using email and password
 * 4. Verify the response contains valid authorization info
 * 5. Verify last_active_at is set and recent
 * 6. Verify authorization token is present
 */
export async function test_api_admin_login_updates_last_active_at(
  connection: api.IConnection,
) {
  // Step 1: Generate test credentials for admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  // Step 2: Record time before login attempt
  const beforeLogin = new Date();

  // Step 3: Perform admin login with credentials
  const authorized: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });

  // Validate the complete response structure (all types, formats, etc.)
  typia.assert(authorized);

  // Record time after login completion
  const afterLogin = new Date();

  // Step 4: Verify the authorization response contains admin info
  TestValidator.equals(
    "admin email matches input",
    authorized.email,
    adminEmail,
  );

  // Step 5: Verify last_active_at is set and reflects login time
  TestValidator.predicate(
    "last_active_at is present after login",
    authorized.last_active_at !== null &&
      authorized.last_active_at !== undefined,
  );

  if (authorized.last_active_at) {
    // Parse the timestamp and verify it reflects the login time
    const lastActiveAt = new Date(authorized.last_active_at);

    TestValidator.predicate(
      "last_active_at is after login start time",
      lastActiveAt >= beforeLogin,
    );

    TestValidator.predicate(
      "last_active_at is before login completion",
      lastActiveAt <= afterLogin,
    );
  }

  // Step 6: Verify authorization token is present and valid
  TestValidator.predicate(
    "authorization token is present",
    authorized.token !== null && authorized.token !== undefined,
  );

  TestValidator.predicate(
    "access token is not empty",
    authorized.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is not empty",
    authorized.token.refresh.length > 0,
  );
}
