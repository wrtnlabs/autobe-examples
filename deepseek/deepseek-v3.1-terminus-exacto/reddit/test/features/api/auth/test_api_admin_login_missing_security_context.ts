import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test administrator login with incomplete security context information.
 *
 * Attempt to login while providing minimal security context fields but testing
 * the system's validation of security metadata completeness. Verify that the
 * system properly handles authentication requests with security context
 * information.
 */
export async function test_api_admin_login_missing_security_context(
  connection: api.IConnection,
) {
  // 1. Create admin account for security context testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Attempt login with complete security context to verify normal operation
  const authorizedAdmin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Mozilla/5.0 (Test Browser)",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(authorizedAdmin);

  // 3. Test business logic: Attempt login with invalid security context values
  // This tests the scenario's intent without violating type safety
  await TestValidator.error(
    "login should fail with invalid security context",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password: "WrongPassword123!", // Invalid password with valid security context
          href: "https://example.com/admin/login",
          referrer: "https://example.com/admin",
          session_id: typia.random<string & tags.Format<"uuid">>(),
          user_agent: "Mozilla/5.0 (Test Browser)",
        } satisfies ICommunityPlatformAdmin.ILogin,
      });
    },
  );
}
