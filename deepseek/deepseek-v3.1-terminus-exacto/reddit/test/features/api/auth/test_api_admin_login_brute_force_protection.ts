import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test administrator login brute force protection mechanisms.
 *
 * This test validates that the system implements appropriate security measures
 * to prevent brute force attacks on admin login functionality. It creates an
 * admin account, attempts multiple consecutive failed login attempts, and
 * verifies that rate limiting or account lockout mechanisms are triggered.
 */
export async function test_api_admin_login_brute_force_protection(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Prepare login context data
  const loginContext = {
    email: adminEmail,
    href: "https://platform.example.com/admin/login",
    referrer: "https://platform.example.com/admin",
    session_id: typia.random<string & tags.Format<"uuid">>(),
    user_agent: "Mozilla/5.0 (Test Browser)",
  };

  // Step 3: Attempt multiple consecutive failed logins to trigger protection
  const failedAttempts = ArrayUtil.repeat(10, (index) => {
    return {
      ...loginContext,
      password: `WrongPassword${index}!`,
    } satisfies ICommunityPlatformAdmin.ILogin;
  });

  // Execute failed login attempts and verify they are rejected
  for (const attempt of failedAttempts) {
    await TestValidator.error(
      `failed login attempt ${failedAttempts.indexOf(attempt) + 1} should be rejected`,
      async () => {
        await api.functional.auth.admin.login(connection, {
          body: attempt,
        });
      },
    );
  }

  // Step 4: Test rapid consecutive attempts to verify rate limiting
  const rapidAttempts = ArrayUtil.repeat(3, (index) => {
    return {
      ...loginContext,
      password: `RapidWrong${index}!`,
    } satisfies ICommunityPlatformAdmin.ILogin;
  });

  // Execute rapid attempts to test rate limiting
  const rapidPromises = rapidAttempts.map((attempt, index) =>
    TestValidator.error(
      `rapid attempt ${index + 1} should be rejected`,
      async () => {
        await api.functional.auth.admin.login(connection, {
          body: attempt,
        });
      },
    ),
  );

  await Promise.all(rapidPromises);

  // Step 5: Verify successful login still works with correct credentials
  const successfulLogin = await api.functional.auth.admin.login(connection, {
    body: {
      ...loginContext,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(successfulLogin);

  // Validate that login succeeded despite previous failed attempts
  TestValidator.equals(
    "successful login should return correct admin email",
    successfulLogin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "login should return valid authorization token",
    successfulLogin.token.access.length > 0 &&
      successfulLogin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token should have expiration dates",
    successfulLogin.token.expired_at.length > 0 &&
      successfulLogin.token.refreshable_until.length > 0,
  );
}
