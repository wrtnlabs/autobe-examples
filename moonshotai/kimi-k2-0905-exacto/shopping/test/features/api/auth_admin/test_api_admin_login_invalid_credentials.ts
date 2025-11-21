import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin login rejection with invalid credentials to validate security
 * standards.
 *
 * This test ensures that unauthorized access attempts trigger appropriate
 * authentication errors preventing platform management access. Validates that
 * comprehensive error handling maintains security consciousness for sensitive
 * administrative access points. Verifies that brute force protection measures
 * safeguard administrative accounts from unauthorized access attempts while
 * maintaining clear communication standards.
 */
export async function test_api_admin_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Test 1: Login with non-existent admin credentials
  const nonExistentEmail = "nonexistent.admin@example.com";
  await TestValidator.error(
    "non-existent admin credentials should be rejected",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: nonExistentEmail,
          password: "wrongPassword123",
          href: "https://example.com/admin/login",
          referrer: "https://example.com/admin",
          ip: "192.168.1.1",
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // Test 2: Login with invalid email format
  const invalidEmail = "not-an-email-format";
  await TestValidator.error(
    "invalid email format should be rejected",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: invalidEmail,
          password: "validPassword123",
          href: "https://example.com/admin/login",
          referrer: "https://example.com/admin",
          ip: "10.0.0.1",
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // Test 3: Login with wrong password (structurally valid credentials)
  const validEmailFormat = typia.random<string & tags.Format<"email">>();
  await TestValidator.error("wrong password should be rejected", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: validEmailFormat,
        password: "wrongPassword123!",
        href: "https://example.com/admin/login",
        referrer: "https://example.com/admin",
        ip: "172.16.0.1",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  });

  // Test 4: Login with empty password
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.error("empty password should be rejected", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "",
        href: "https://example.com/admin/login",
        referrer: "https://example.com/admin",
        ip: "203.0.113.1",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  });

  // Test 5: Login with suspicious but format-compliant email variations
  const suspiciousEmails = [
    "admin+xss@test.com",
    "admin@test.com.bak",
    "admin@test@gmail.com",
    "admin@test_co.uk",
  ];

  for (const suspiciousEmail of suspiciousEmails) {
    await TestValidator.error(
      `suspicious email '${suspiciousEmail}' should be rejected`,
      async () => {
        await api.functional.auth.admin.login(connection, {
          body: {
            email: suspiciousEmail,
            password: "testPassword123",
            href: "https://example.com/admin/login",
            referrer: "https://example.com/admin",
            ip: "198.51.100.1",
          } satisfies IShoppingMallAdmin.ILogin,
        });
      },
    );
  }
}
