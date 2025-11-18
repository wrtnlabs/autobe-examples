import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password reset request with invalid email address format.
 *
 * Validates that the password reset endpoint properly rejects email addresses
 * that don't conform to RFC 5322 email format standards. Tests multiple invalid
 * email format scenarios including missing @, invalid domains, spaces, and
 * special character combinations. Each invalid email should be rejected with an
 * appropriate validation error response.
 *
 * Test steps:
 *
 * 1. Submit password reset request with email missing @ symbol
 * 2. Submit password reset request with email missing domain
 * 3. Submit password reset request with email containing spaces
 * 4. Submit password reset request with email containing consecutive dots
 * 5. Submit password reset request with email containing multiple @ symbols
 * 6. Verify all requests are rejected with validation errors
 */
export async function test_api_password_reset_request_invalid_email_format(
  connection: api.IConnection,
) {
  // Test cases for invalid email formats
  const invalidEmails = [
    "testexample.com", // Missing @ symbol
    "test@", // Missing domain
    "test @example.com", // Space before @
    "test@ example.com", // Space after @
    "test..user@example.com", // Consecutive dots in local part
    "test@test@example.com", // Multiple @ symbols
    "@example.com", // Missing local part
    "test@.com", // Missing domain name
    "test user@example.com", // Space in local part
    "test@exam ple.com", // Space in domain
  ];

  // Test each invalid email format
  for (const invalidEmail of invalidEmails) {
    await TestValidator.error(
      `should reject invalid email format: "${invalidEmail}"`,
      async () => {
        await api.functional.auth.user.password.reset_request.resetPasswordRequest(
          connection,
          {
            body: {
              email: invalidEmail,
            } satisfies ITodoListUser.IPasswordResetRequest,
          },
        );
      },
    );
  }
}
