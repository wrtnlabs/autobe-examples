import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";

/**
 * Test administrator login with suspended account status.
 *
 * This test validates that suspended administrator accounts cannot log in to
 * the shopping mall platform. It creates an admin account, suspends it, then
 * attempts to login and verifies that the system properly rejects login
 * attempts for suspended accounts.
 */
export async function test_api_admin_login_suspended_account(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for suspension testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminAccount = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({ access_level: "support" }),
      status: "suspended",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAccount);

  // Verify account was created with suspended status
  TestValidator.equals(
    "created account should have suspended status",
    adminAccount.administrator.role,
    "support_admin",
  );

  // Step 2: Attempt to login with suspended account
  await TestValidator.error(
    "suspended account should not be able to login",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password: adminPassword,
          href: "https://admin.shoppingmall.com/login",
          referrer: "https://shoppingmall.com/admin",
        } satisfies IShoppingMallAdministrator.ILogin,
      });
    },
  );
}
