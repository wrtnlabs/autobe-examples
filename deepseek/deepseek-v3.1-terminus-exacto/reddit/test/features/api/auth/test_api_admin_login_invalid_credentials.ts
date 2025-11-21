import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test administrator login with invalid credentials.
 *
 * This test validates that the authentication system properly rejects invalid
 * credentials by testing both incorrect passwords and non-existent email
 * addresses. It ensures security mechanisms work correctly without allowing
 * unauthorized access.
 */
export async function test_api_admin_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create a valid admin account for testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "correctPassword123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "content",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test login with incorrect password
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password: "wrongPassword456",
          ip: "192.168.1.100",
          href: "https://example.com/login",
          referrer: "https://example.com",
          session_id: RandomGenerator.alphaNumeric(32),
          user_agent: "Mozilla/5.0 Test Browser",
        } satisfies ICommunityPlatformAdmin.ILogin,
      });
    },
  );

  // Step 3: Test login with non-existent email
  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "anyPassword789",
          ip: "192.168.1.101",
          href: "https://example.com/login",
          referrer: "https://example.com",
          session_id: RandomGenerator.alphaNumeric(32),
          user_agent: "Mozilla/5.0 Test Browser",
        } satisfies ICommunityPlatformAdmin.ILogin,
      });
    },
  );

  // Step 4: Verify that valid credentials still work (sanity check)
  const validLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.102",
      href: "https://example.com/login",
      referrer: "https://example.com",
      session_id: RandomGenerator.alphaNumeric(32),
      user_agent: "Mozilla/5.0 Test Browser",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(validLogin);
  TestValidator.equals(
    "valid login should return matching email",
    validLogin.email,
    adminEmail,
  );
}
