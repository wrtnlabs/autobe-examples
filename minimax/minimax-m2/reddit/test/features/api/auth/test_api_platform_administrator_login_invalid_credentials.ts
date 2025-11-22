import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_platform_administrator_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create a legitimate platform administrator account for testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestAdmin123!";

  const adminAccount: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        email: adminEmail,
        password: adminPassword,
        display_name: "Test Administrator",
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: {
            can_create_users: true,
            can_modify_users: true,
            can_view_user_data: true,
          },
          community_oversight: {
            can_view_community_data: true,
          },
          content_moderation: {
            can_remove_content: true,
          },
          system_configuration: {
            can_view_system_logs: true,
          },
          compliance_legal: {
            can_access_compliance_data: true,
          },
        }),
        security_clearance: "medium",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(adminAccount);

  // Step 2: Test invalid email with correct password
  await TestValidator.error(
    "login should fail with invalid email",
    async () => {
      await api.functional.auth.platformAdministrator.login(connection, {
        body: {
          email: "invalid@example.com", // Wrong email
          password: adminPassword, // Correct password
          ip: "192.168.1.100",
          href: "https://admin.example.com/login",
          referrer: "https://admin.example.com/dashboard",
        } satisfies IRedditPlatformPlatformAdministrator.ILogin,
      });
    },
  );

  // Step 3: Test correct email with invalid password
  await TestValidator.error(
    "login should fail with invalid password",
    async () => {
      await api.functional.auth.platformAdministrator.login(connection, {
        body: {
          email: adminEmail, // Correct email
          password: "WrongPassword123!", // Wrong password
          ip: "192.168.1.101",
          href: "https://admin.example.com/login",
          referrer: "https://admin.example.com/dashboard",
        } satisfies IRedditPlatformPlatformAdministrator.ILogin,
      });
    },
  );

  // Step 4: Test both email and password incorrect
  await TestValidator.error(
    "login should fail with both email and password incorrect",
    async () => {
      await api.functional.auth.platformAdministrator.login(connection, {
        body: {
          email: "nonexistent@example.com", // Invalid email
          password: "CompletelyWrong123!", // Invalid password
          ip: "192.168.1.102",
          href: "https://admin.example.com/login",
          referrer: "https://admin.example.com/dashboard",
        } satisfies IRedditPlatformPlatformAdministrator.ILogin,
      });
    },
  );

  // Step 5: Verify successful login with correct credentials (baseline test)
  const validLoginResult: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "192.168.1.103",
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/dashboard",
      } satisfies IRedditPlatformPlatformAdministrator.ILogin,
    });
  typia.assert(validLoginResult);

  // Step 6: Validate successful authentication response structure
  TestValidator.equals(
    "administrator ID should be present",
    validLoginResult.id !== undefined && validLoginResult.id !== null,
    true,
  );

  TestValidator.equals(
    "administrator level should be preserved",
    validLoginResult.administrator_level,
    adminAccount.administrator_level,
  );

  TestValidator.equals(
    "security clearance should be maintained",
    validLoginResult.security_clearance,
    adminAccount.security_clearance,
  );

  TestValidator.equals(
    "JWT tokens should be generated",
    validLoginResult.token.access.length > 0 &&
      validLoginResult.token.refresh.length > 0,
    true,
  );

  TestValidator.equals(
    "user information should be included",
    validLoginResult.user.username === adminAccount.user.username,
    true,
  );

  // Step 7: Verify system protection - attempt to access administrative functions with invalid session
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "administrative access should be rejected without valid authentication",
    async () => {
      await api.functional.auth.platformAdministrator.join(
        unauthenticatedConnection,
        {
          body: {
            username: "unauthorized_user",
            email: "unauthorized@example.com",
            password: "password123",
            administrator_level: "admin",
            system_permissions: JSON.stringify({}),
            security_clearance: "low",
          } satisfies IRedditPlatformPlatformAdministrator.ICreate,
        },
      );
    },
  );
}
