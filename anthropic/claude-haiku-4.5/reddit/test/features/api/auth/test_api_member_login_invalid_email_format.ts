import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test member login rejection with invalid email format.
 *
 * Validates that the member login endpoint properly rejects authentication
 * requests when an improperly formatted email address is provided. This test
 * ensures email format validation is enforced at the API level before
 * attempting credential verification.
 *
 * The test submits login requests with various invalid email formats and
 * confirms that each is rejected with an appropriate validation error:
 *
 * 1. Missing @ symbol (e.g., "userexample.com")
 * 2. Missing domain (e.g., "user@")
 * 3. Spaces in email (e.g., "user @example.com")
 * 4. Double @ symbols (e.g., "user@@example.com")
 * 5. Missing local part (e.g., "@example.com")
 * 6. Missing domain extension (e.g., "user@example")
 * 7. Leading/trailing spaces (e.g., " user@example.com")
 * 8. Invalid special characters (e.g., "user#@example.com")
 *
 * Each invalid email format should trigger an API validation error response.
 */
export async function test_api_member_login_invalid_email_format(
  connection: api.IConnection,
) {
  // Test cases with various invalid email formats
  const invalidEmails = [
    "userexample.com", // Missing @ symbol
    "user@", // Missing domain
    "user @example.com", // Space before @
    "user@@example.com", // Double @ symbols
    "@example.com", // Missing local part
    "user@example", // Missing domain extension
    " user@example.com", // Leading space
    "user@example.com ", // Trailing space
    "user#@example.com", // Invalid special character
    "user.@example.com", // Dot before @
    ".user@example.com", // Leading dot
    "user@.example.com", // Dot after @
  ];

  // Valid password for testing (meets minimum 8 character requirement)
  const validPassword = "password123";

  // Valid href and referrer URLs for session context
  const validHref = "http://localhost:3000/login";
  const validReferrer = "http://localhost:3000/";

  // Test each invalid email format
  for (const invalidEmail of invalidEmails) {
    await TestValidator.error(
      `should reject login with invalid email format: "${invalidEmail}"`,
      async () => {
        await api.functional.auth.member.login(connection, {
          body: {
            email: invalidEmail,
            password: validPassword,
            href: validHref,
            referrer: validReferrer,
          } satisfies ICommunityPlatformMember.ILogin,
        });
      },
    );
  }
}
