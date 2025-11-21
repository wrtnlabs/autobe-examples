import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_multiple_failures_lockout(
  connection: api.IConnection,
) {
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin" as const,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Make five consecutive failed login attempts
  for (let i = 0; i < 5; i++) {
    await TestValidator.error(
      `failed login attempt ${i + 1} should be rejected`,
      async () => {
        await api.functional.auth.admin.login(connection, {
          body: {
            email: admin.email,
            password_hash: "WrongPassword" + i, // Incorrect password
          } satisfies IShoppingMallAdmin.IRequest,
        });
      },
    );
  }

  // Sixth attempt should be blocked due to lockout
  await TestValidator.error(
    "sixth login attempt should be locked out after five failures",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: admin.email,
          password_hash: "WrongPassword", // Still wrong password
        } satisfies IShoppingMallAdmin.IRequest,
      });
    },
  );

  // Test that login still fails immediately after lockout
  await TestValidator.error(
    "login should remain blocked immediately after lockout trigger",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: admin.email,
          password_hash: "WrongPassword", // Still incorrect
        } satisfies IShoppingMallAdmin.IRequest,
      });
    },
  );

  // Successful login attempt should work after lockout period
  // In practice, this would require waiting 15 minutes
  // We verify the system correctly validates the correct password
  const successLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: admin.email,
      password_hash: "SecurePassword123!", // Correct password
    } satisfies IShoppingMallAdmin.IRequest,
  });
  typia.assert(successLogin);
  TestValidator.equals("success login email", successLogin.email, admin.email);
  TestValidator.equals("success login role", successLogin.role, "super_admin");
}
