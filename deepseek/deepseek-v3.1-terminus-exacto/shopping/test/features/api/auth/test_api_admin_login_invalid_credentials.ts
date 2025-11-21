import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";

/**
 * Test administrator login with incorrect credentials.
 *
 * This test validates that the authentication system properly rejects login
 * attempts when invalid credentials are provided. It creates a valid
 * administrator account, then attempts to authenticate using the correct email
 * but incorrect password, ensuring security protocols are maintained without
 * revealing specific validation details.
 */
export async function test_api_admin_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create a valid administrator account for testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "correctPassword123";
  const invalidPassword = "wrongPassword456";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: validPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({ access: ["read", "write"] }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Attempt login with incorrect password
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password: invalidPassword,
          ip: "192.168.1.100",
          href: "https://admin.example.com/login",
          referrer: "https://admin.example.com/dashboard",
        } satisfies IShoppingMallAdministrator.ILogin,
      });
    },
  );

  // Step 3: Verify that valid login still works (sanity check)
  const validLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: validPassword,
      ip: "192.168.1.100",
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/dashboard",
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(validLogin);
  TestValidator.equals(
    "valid login should return administrator data",
    validLogin.administrator.email,
    adminEmail,
  );
}
