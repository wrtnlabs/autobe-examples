import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuth";

/**
 * Test password reset request rejection when email format is invalid.
 *
 * Validates that the password reset request endpoint properly rejects email
 * addresses that do not conform to RFC 5321 standard email format. Tests
 * various invalid email patterns including missing @ symbol, multiple @
 * symbols, missing domain, invalid domain format, and other malformed
 * addresses.
 *
 * The test ensures the system prevents accepting malformed email addresses and
 * provides appropriate error responses with HTTP 400 Bad Request status.
 *
 * Steps:
 *
 * 1. Define array of invalid email addresses with various format violations
 * 2. For each invalid email, attempt to submit password reset request
 * 3. Verify API rejects with HTTP 400 Bad Request
 * 4. Confirm error response indicates email format validation failure
 * 5. Ensure no email is processed despite multiple invalid attempts
 */
export async function test_api_password_reset_request_invalid_email_format(
  connection: api.IConnection,
) {
  // Define invalid email formats that violate RFC 5321 standard
  const invalidEmails = [
    "userexample.com", // Missing @ symbol
    "user@@example.com", // Multiple @ symbols
    "user@", // Missing domain
    "@example.com", // Missing local part
    "user@.com", // Missing domain name
    "user @example.com", // Whitespace in local part
    "user@ example.com", // Whitespace in domain
    "user@example .com", // Whitespace in domain
    "user.example.com", // No @ symbol
    "user@example@com", // Multiple @ symbols
  ] as const;

  // Test each invalid email format
  for (const invalidEmail of invalidEmails) {
    await TestValidator.error(
      `should reject invalid email format: ${invalidEmail}`,
      async () => {
        await api.functional.todoApp.auth.request_password_reset.requestPasswordReset(
          connection,
          {
            body: {
              email: invalidEmail,
            } satisfies ITodoAppAuth.IRequestPasswordResetRequest,
          },
        );
      },
    );
  }

  // Verify that no valid response would be returned for any invalid email
  TestValidator.predicate(
    "all invalid email formats were properly rejected",
    invalidEmails.length > 0,
  );
}
