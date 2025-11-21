import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer login with non-existent email address.
 *
 * This test validates that the authentication system properly handles login
 * attempts with non-existent email addresses. The system should respond
 * consistently regardless of whether the email exists, preventing user
 * enumeration attacks. No authentication tokens should be issued when login
 * fails, and appropriate error responses should be returned without revealing
 * account existence.
 *
 * Test steps:
 *
 * 1. Generate a random non-existent email address
 * 2. Attempt login with the non-existent email and random password
 * 3. Verify that login fails with appropriate error handling
 * 4. Ensure no authentication tokens are issued
 * 5. Confirm error response doesn't reveal account existence
 */
export async function test_api_customer_login_nonexistent_account(
  connection: api.IConnection,
) {
  // Generate a random non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const randomPassword = RandomGenerator.alphaNumeric(12);

  // Store original connection to verify no token is set
  const originalAuthHeader = connection.headers?.Authorization;

  // Attempt login with non-existent credentials
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email: nonExistentEmail,
          password: randomPassword,
          href: "https://test.example.com/login",
          referrer: "https://test.example.com",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );

  // Verify no authentication token was issued
  TestValidator.equals(
    "no authorization token should be set after failed login",
    connection.headers?.Authorization,
    originalAuthHeader,
  );

  // Test with different non-existent email to ensure consistent behavior
  const anotherNonExistentEmail = typia.random<string & tags.Format<"email">>();
  const anotherRandomPassword = RandomGenerator.alphaNumeric(10);

  await TestValidator.error(
    "login with different non-existent email should also fail consistently",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email: anotherNonExistentEmail,
          password: anotherRandomPassword,
          href: "https://test.example.com/login",
          referrer: "https://test.example.com",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );

  // Verify connection state remains unchanged after multiple failed attempts
  TestValidator.equals(
    "connection authorization should remain unchanged after multiple failures",
    connection.headers?.Authorization,
    originalAuthHeader,
  );
}
