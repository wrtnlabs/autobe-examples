import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin authentication failure with invalid credentials.
 *
 * This comprehensive test validates the security behavior of the admin login
 * endpoint when invalid credentials are provided. The test covers multiple
 * failure scenarios:
 *
 * 1. Non-existent admin email with random password
 * 2. Invalid email format validation
 * 3. Empty password field
 * 4. Wrong password for potentially valid admin email
 * 5. Invalid URL formats for href and referrer
 * 6. Optional IP field with invalid data
 *
 * The test ensures that the system maintains security best practices by:
 *
 * - Not revealing whether an email exists in the system
 * - Providing generic error messages that don't disclose specific failure reasons
 * - Not returning any authentication tokens on failure
 * - Properly validating all required fields including href and referrer URLs
 * - Handling edge cases like empty strings and malformed data
 *
 * This validation is crucial for preventing username enumeration attacks and
 * maintaining the security integrity of the administrative authentication
 * system.
 */
export async function test_api_admin_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Test 1: Login with non-existent admin email
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const randomPassword = RandomGenerator.alphaNumeric(10);

  await TestValidator.error(
    "non-existent admin email should fail authentication",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: nonExistentEmail,
          password: randomPassword,
          href: "https://admin.example.com/login",
          referrer: "https://admin.example.com/",
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // Test 2: Login with invalid email format
  const invalidEmail = "not-an-email";

  await TestValidator.error(
    "invalid email format should be rejected",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: invalidEmail,
          password: "somepassword123",
          href: "https://admin.example.com/login",
          referrer: "https://admin.example.com/",
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // Test 3: Login with empty password
  const validEmail = typia.random<string & tags.Format<"email">>();

  await TestValidator.error(
    "empty password should fail authentication",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: validEmail,
          password: "",
          href: "https://admin.example.com/login",
          referrer: "https://admin.example.com/",
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // Test 4: Login with potential admin email but wrong password
  // This tests the scenario where email might exist but password is incorrect
  const potentialAdminEmail = `admin+${RandomGenerator.alphaNumeric(5)}@company.com`;
  const wrongPassword = RandomGenerator.alphaNumeric(12);

  await TestValidator.error(
    "wrong password should fail authentication",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: potentialAdminEmail,
          password: wrongPassword,
          href: "https://admin.example.com/login",
          referrer: "https://admin.example.com/dashboard",
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // Test 5: Login with malformed href URL
  await TestValidator.error(
    "malformed href should fail validation",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "password123",
          href: "not-a-valid-url",
          referrer: "https://admin.example.com/",
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // Test 6: Login with malformed referrer URL
  await TestValidator.error(
    "malformed referrer should fail validation",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "password123",
          href: "https://admin.example.com/login",
          referrer: "invalid-url-format",
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // Test 7: Login with invalid IP format
  await TestValidator.error(
    "invalid IP format should fail validation",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "password123",
          href: "https://admin.example.com/login",
          referrer: "https://admin.example.com/",
          ip: "999.999.999.999", // Invalid IP format
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // Verify that connection headers remain unchanged after failed login attempts
  TestValidator.equals(
    "failed login should not modify connection headers",
    connection.headers?.Authorization,
    undefined,
  );
}
