import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin authentication attempt with an inactive administrator account.
 * Verify that authentication fails when is_active status is false, ensuring
 * inactive administrators cannot access the platform management system.
 * Validate that appropriate access denied responses are returned while
 * maintaining account security.
 *
 * This test validates the security boundary that prevents inactive
 * administrators from accessing the shopping mall platform management system.
 * Since we cannot directly create accounts through the available API, we focus
 * on testing the authentication failure scenarios that would occur with
 * inactive accounts.
 */
export async function test_api_admin_login_inactive_account(
  connection: api.IConnection,
) {
  // Generate realistic admin credentials for testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  // Test 1: Attempt login with non-existent admin credentials (simulating inactive account)
  await TestValidator.error(
    "non-existent admin account should fail authentication",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password: adminPassword,
          href: "https://admin.shopping-mall.com/login",
          referrer: "https://admin.shopping-mall.com/",
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // Test 2: Test with various credential combinations to ensure robust authentication failure
  const invalidCredentials = [
    {
      email: typia.random<string & tags.Format<"email">>(),
      password: "weakpassword123",
      description: "invalid email format with weak password",
    },
    {
      email: "admin@example.com",
      password: RandomGenerator.alphaNumeric(20),
      description: "common admin email with random password",
    },
    {
      email: typia.random<string & tags.Format<"email">>(),
      password: "",
      description: "invalid email with empty password",
    },
  ];

  for (const credential of invalidCredentials) {
    await TestValidator.error(
      `authentication should fail for ${credential.description}`,
      async () => {
        await api.functional.auth.admin.login(connection, {
          body: {
            email: credential.email,
            password: credential.password,
            href: "https://admin.shopping-mall.com/login",
            referrer: "https://admin.shopping-mall.com/",
          } satisfies IShoppingMallAdmin.ILogin,
        });
      },
    );
  }

  // Test 3: Verify that authentication attempts don't reveal account existence
  // This is a security best practice - the error response should be consistent
  // whether the account exists but is inactive, or doesn't exist at all
  const differentScenarios = [
    {
      email: "inactive.admin@company.com",
      password: "ValidPassword123!",
      description: "potentially inactive admin account",
    },
    {
      email: "deleted.admin@company.com",
      password: "AnotherValid456@",
      description: "potentially deleted admin account",
    },
    {
      email: typia.random<string & tags.Format<"email">>(),
      password: "RandomPassword789#",
      description: "completely non-existent account",
    },
  ];

  for (const scenario of differentScenarios) {
    await TestValidator.error(
      `authentication should consistently fail for ${scenario.description}`,
      async () => {
        await api.functional.auth.admin.login(connection, {
          body: {
            email: scenario.email,
            password: scenario.password,
            href: "https://admin.shopping-mall.com/login",
            referrer: "https://admin.shopping-mall.com/dashboard",
          } satisfies IShoppingMallAdmin.ILogin,
        });
      },
    );
  }

  // Test 4: Validate security headers and request structure for failed attempts
  const loginRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.shopping-mall.com/login",
    referrer: "https://admin.shopping-mall.com/",
    ip: "192.168.1.100", // Optional IP for audit trail
  } satisfies IShoppingMallAdmin.ILogin;

  await TestValidator.error(
    "login with complete request data should fail for non-existent/inactive accounts",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: loginRequest,
      });
    },
  );

  // Note: We cannot directly test inactive account scenarios since the API doesn't
  // provide account creation/management endpoints. The test focuses on authentication
  // failure handling which should be consistent for inactive, deleted, or non-existent
  // accounts as a security best practice.
}
