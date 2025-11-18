import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_registration_invalid_email_format(
  connection: api.IConnection,
) {
  /**
   * Test invalid email formats during user registration.
   *
   * This test validates that the registration endpoint properly rejects various
   * types of malformed email addresses that do not conform to RFC 5322 email
   * format standards. The system should validate email format and reject
   * invalid emails with appropriate error responses. No user accounts should be
   * created for invalid email submissions.
   *
   * Invalid email patterns tested:
   *
   * 1. Missing @ symbol
   * 2. Missing domain
   * 3. Invalid domain structure
   * 4. Invalid characters
   * 5. Multiple @ symbols
   * 6. Spaces in email
   * 7. Empty local part
   * 8. Empty domain part
   */

  // Generate a valid password that meets requirements
  const validPassword = RandomGenerator.alphabets(12);

  // Generate a valid URI for href and referrer
  const validHref = typia.random<string & tags.Format<"uri">>();
  const validReferrer = typia.random<string & tags.Format<"uri">>();

  // Define invalid email formats to test
  const invalidEmails = [
    "notanemail", // Missing @ symbol
    "user@", // Missing domain
    "@domain.com", // Missing local part
    "user@.com", // Missing domain name
    "user name@domain.com", // Space in local part
    "user@domain @com", // Space in domain
    "user@@domain.com", // Double @ symbol
    "user@domain..com", // Double dot in domain
    "user.@domain.com", // Dot before @
    ".user@domain.com", // Starts with dot
    "user@domain.c", // TLD too short (single character)
    "user@", // Empty domain
    "@", // Only @ symbol
    "user@domain,com", // Comma instead of dot
    "user@domain.com.", // Ends with dot
    "user@.domain.com", // Dot after @
    "user@domain.com@", // @ at the end
    "user name@example.com", // Space in address
    "user@dom@in.com", // Multiple @ symbols
    "user..name@domain.com", // Double dots in local part
  ];

  // Test each invalid email format
  for (const invalidEmail of invalidEmails) {
    await TestValidator.error(
      `should reject invalid email format: ${invalidEmail}`,
      async () => {
        await api.functional.auth.user.join(connection, {
          body: {
            email: invalidEmail,
            password: validPassword,
            href: validHref,
            referrer: validReferrer,
          } satisfies ITodoListUser.ICreate,
        });
      },
    );
  }
}
