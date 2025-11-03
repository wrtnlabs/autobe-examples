import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_login_account_lockout_after_failed_attempts(
  connection: api.IConnection,
) {
  /**
   * Test account lockout security mechanism after multiple consecutive failed
   * admin login attempts within a 15-minute window. The scenario validates that
   * after 5 failed login attempts, the admin account is temporarily locked for
   * 30 minutes and subsequent attempts are rejected with account locked error.
   * This tests the brute force protection mechanism for admin accounts.
   */

  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "ValidPassword123"; // 8+ characters as per requirements

  const registeredAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      password_confirmation: adminPassword,
    } satisfies ITodoAppAdmin.IRegister,
  });
  typia.assert(registeredAdmin);
  TestValidator.equals(
    "admin registered successfully",
    registeredAdmin.status,
    "active",
  );

  // Create unauthenticated connection for testing failed logins
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 2-5: Attempt 5 failed logins with wrong password
  const wrongPassword = "WrongPassword123";

  for (let i = 1; i <= 5; i++) {
    await TestValidator.error(`failed login attempt ${i}`, async () => {
      await api.functional.auth.admin.login(unauthConnection, {
        body: {
          email: adminEmail,
          password: wrongPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppAdmin.ILogin,
      });
    });
  }

  // Step 6: After 5 failed attempts, account should be locked
  // Next attempt (6th) should fail with account locked error
  await TestValidator.error(
    "account locked after 5 failed attempts",
    async () => {
      await api.functional.auth.admin.login(unauthConnection, {
        body: {
          email: adminEmail,
          password: adminPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppAdmin.ILogin,
      });
    },
  );

  // Step 7: Verify subsequent attempts also fail due to lock
  await TestValidator.error(
    "subsequent login attempt fails due to lock",
    async () => {
      await api.functional.auth.admin.login(unauthConnection, {
        body: {
          email: adminEmail,
          password: adminPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppAdmin.ILogin,
      });
    },
  );
}
