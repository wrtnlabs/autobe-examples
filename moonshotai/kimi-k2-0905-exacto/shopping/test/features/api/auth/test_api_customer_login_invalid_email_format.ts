import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer login with invalid email format to verify email validation
 * enforcement
 *
 * This test validates the customer authentication system's email format
 * validation by attempting login with various malformed email addresses. The
 * system should:
 *
 * - Reject emails missing @ symbol (e.g., "invalid-email")
 * - Reject emails with incomplete domain (e.g., "user@")
 * - Reject emails with invalid characters or formats
 * - Return appropriate validation error messages
 * - Not generate any authentication tokens
 * - Handle invalid emails gracefully from a security perspective
 *
 * The test ensures that email validation is enforced at the API level,
 * providing proper validation errors that help users understand correct email
 * format requirements without exposing security-sensitive information.
 */
export async function test_api_customer_login_invalid_email_format(
  connection: api.IConnection,
) {
  // Test various invalid email formats
  const invalidEmails = [
    "invalid-email", // Missing @ symbol
    "user@", // Incomplete domain
    "@domain.com", // Missing local part
    "user@domain", // Missing TLD
    "user@.com", // Missing domain name
    "user@domain.", // Trailing dot
    "user..name@domain.com", // Consecutive dots in local part
    ".user@domain.com", // Leading dot in local part
    "user.@domain.com", // Trailing dot in local part
    "user@domain..com", // Consecutive dots in domain
    "user name@domain.com", // Space in local part
    "user@domain space.com", // Space in domain
    "user@-domain.com", // Dash at domain start
    "user@domain-.com", // Dash at domain end
    "", // Empty string
    "user", // No @ symbol
    "user@", // @ without domain
    "@", // Just @ symbol
  ];

  // Test each invalid email format
  for (const invalidEmail of invalidEmails) {
    await TestValidator.error(
      `should reject invalid email format: "${invalidEmail}"`,
      async () => {
        await api.functional.auth.customer.login(connection, {
          body: {
            email: invalidEmail,
            password: "ValidPassword123!",
            href: "https://shopping-mall.example.com/login",
            referrer: "https://shopping-mall.example.com/",
          } satisfies IShoppingMallCustomer.ILogin,
        });
      },
    );
  }

  // Verify connection headers remain unchanged (no token should be set)
  TestValidator.equals(
    "connection headers should remain unchanged for invalid email attempts",
    connection.headers?.Authorization,
    undefined,
  );
}
