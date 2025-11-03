import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test successful admin login and account status validation.
 *
 * This test validates the admin authentication flow. Since there is no API
 * endpoint available to change an admin account's status to inactive, we focus
 * on testing the successful authentication scenario and verifying that the
 * login response correctly includes the account status information.
 *
 * The test creates a new admin account and verifies that:
 *
 * 1. Admin registration succeeds and returns an active account
 * 2. The admin can successfully login with correct credentials
 * 3. The login response includes proper account status and authorization tokens
 *
 * Note: Testing login denial for inactive accounts would require an additional
 * API endpoint to update admin account status (e.g., PATCH /auth/admin/{id}).
 */
export async function test_api_admin_login_inactive_account(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPassword123";

  const registerResponse = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      password_confirmation: adminPassword,
    } satisfies ITodoAppAdmin.IRegister,
  });
  typia.assert(registerResponse);

  TestValidator.equals(
    "admin account created with active status",
    registerResponse.status,
    "active",
  );
  TestValidator.equals(
    "admin email matches registration input",
    registerResponse.email,
    adminEmail,
  );

  // Step 2: Verify successful login with the newly created account
  const loginResponse = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppAdmin.ILogin,
  });
  typia.assert(loginResponse);

  TestValidator.equals(
    "login response returns correct admin email",
    loginResponse.email,
    adminEmail,
  );
  TestValidator.equals(
    "login response shows active account status",
    loginResponse.status,
    "active",
  );
  TestValidator.predicate(
    "login response includes valid access token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response includes valid refresh token",
    loginResponse.token.refresh.length > 0,
  );
}
