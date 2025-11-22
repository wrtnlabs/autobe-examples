import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test administrator login with invalid credentials validation.
 *
 * This test validates the security measures of the TodoApp administrator
 * authentication system by ensuring that login attempts with incorrect
 * passwords are properly rejected while maintaining security protocols.
 *
 * The test follows a critical security scenario: a user attempting to login
 * with a valid email address but wrong password, which could indicate
 * credential theft or brute force attempts. The system must reject such
 * attempts while preventing information leakage about whether the email address
 * exists in the system.
 *
 * Process:
 *
 * 1. Create a valid administrator account through the join endpoint
 * 2. Attempt login with the correct email but incorrect password
 * 3. Validate that the authentication system properly rejects the invalid
 *    credentials
 * 4. Confirm security measures are maintained during failed authentication
 */
export async function test_api_admin_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Generate random email for admin account creation
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // Create a valid administrator account
  const adminAccount: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "hashed_password_123", // Simulated hashed password
        role_level: "admin", // Use valid role level from DTO
        status: "active", // Use valid status from DTO
        first_name: "Test",
        last_name: "Admin",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(adminAccount);

  // Attempt login with wrong password - should fail with authentication error
  await TestValidator.error(
    "admin login should fail with wrong password",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail, // Same email as created account
          password: "wrong_password", // Wrong password
          ip: "192.168.1.100", // Valid IP address format
          href: "https://admin.example.com/login", // Valid URI
          referrer: "https://admin.example.com/dashboard", // Valid URI
        } satisfies ITodoAppAdministrator.ILogin,
      });
    },
  );
}
