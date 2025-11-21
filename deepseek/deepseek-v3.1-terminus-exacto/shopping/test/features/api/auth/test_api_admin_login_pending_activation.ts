import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";

/**
 * Test administrator login with pending activation status.
 *
 * This test validates that administrator accounts with 'pending_activation'
 * status cannot successfully authenticate. The system should properly reject
 * login attempts for accounts that have not been activated and return
 * appropriate status-based authentication errors as a security measure.
 */
export async function test_api_admin_login_pending_activation(
  connection: api.IConnection,
) {
  // Generate realistic test data for admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const adminRole = RandomGenerator.pick([
    "super_admin",
    "support_admin",
    "security_admin",
  ] as const);
  const permissions = JSON.stringify({
    access: ["read", "write"],
    scope: ["users", "products"],
  });

  // Step 1: Create admin account with pending_activation status
  const adminAccount = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: firstName,
      last_name: lastName,
      role: adminRole,
      permissions: permissions,
      status: "pending_activation",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAccount);

  // Step 2: Attempt to login with pending activation account
  await TestValidator.error(
    "pending activation account should not be able to login",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password: adminPassword,
          ip: "192.168.1.100",
          href: "https://admin.example.com/login",
          referrer: "https://admin.example.com",
        } satisfies IShoppingMallAdministrator.ILogin,
      });
    },
  );
}
