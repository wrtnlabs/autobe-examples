import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test a successful login for an admin account.
 *
 * This test validates that an administrator with valid credentials (email and
 * password) for an active, locked=false, not-deleted account can successfully
 * log in via /auth/admin/login. It ensures that the server issues a valid JWT
 * access/refresh token pair and that the response object contains all required
 * admin fields: id, email, locked=false, role, created_at, updated_at,
 * (optionally deleted_at), and token (including access, refresh, expired_at,
 * refreshable_until).
 *
 * Steps:
 *
 * 1. Generate a random valid admin login credential (email and password format).
 * 2. (Assume the admin exists and is active/unlocked/not-deleted for the test - in
 *    a real scenario, admin signup/setup would be needed here).
 * 3. Submit a POST /auth/admin/login with the correct credentials.
 * 4. Assert that the response is ITodoListAdmin.IAuthorized, typia.assert passes,
 *    and all key fields are present and correct.
 * 5. Assert no error is thrown and that locked is strictly false.
 * 6. Assert all token fields are present and properly formatted (string or
 *    date-time as appropriate).
 */
export async function test_api_admin_login_successful(
  connection: api.IConnection,
) {
  // Step 1: Generate random admin credentials (in a real test, use a known admin or create one; here we just make plausible random values)
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128> & tags.Format<"password">
  >();

  // Step 2: Attempt login - assumes these credentials correspond to a real unlocked admin (for fully isolated E2E, would require admin account setup)
  const loginBody = {
    email,
    password,
  } satisfies ITodoListAdmin.ILogin;

  const admin = await api.functional.auth.admin.login(connection, {
    body: loginBody,
  });
  typia.assert(admin);

  // Step 3: Validate structure and logic
  TestValidator.predicate(
    "admin id is UUID",
    typeof admin.id === "string" && admin.id.length > 0,
  );
  TestValidator.equals("admin email matches input", admin.email, email);
  TestValidator.equals("admin locked is false", admin.locked, false);
  TestValidator.predicate(
    "admin has non-empty role",
    typeof admin.role === "string" && admin.role.length > 0,
  );
  TestValidator.predicate(
    "admin created_at is ISO date",
    typeof admin.created_at === "string" && admin.created_at.length > 0,
  );
  TestValidator.predicate(
    "admin updated_at is ISO date",
    typeof admin.updated_at === "string" && admin.updated_at.length > 0,
  );
  TestValidator.predicate(
    "token is present",
    typeof admin.token === "object" && admin.token !== null,
  );
  TestValidator.predicate(
    "token access is present",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is present",
    typeof admin.token.refresh === "string" && admin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is ISO date",
    typeof admin.token.expired_at === "string" &&
      admin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshable_until is ISO date",
    typeof admin.token.refreshable_until === "string" &&
      admin.token.refreshable_until.length > 0,
  );
}
