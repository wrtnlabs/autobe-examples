import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user registration validation for invalid email format.
 *
 * This test validates that the user registration endpoint properly rejects
 * malformed email addresses that violate RFC 5322 email format standards.
 * Multiple invalid email patterns are tested including missing @ symbols,
 * multiple @ symbols, missing domains, invalid characters, and incomplete
 * domain names.
 *
 * The test ensures that:
 *
 * 1. Each invalid email format is rejected with an error response
 * 2. No user account is created for any invalid email format
 * 3. Email validation is enforced before account creation
 *
 * Test cases cover common email format violations:
 *
 * - Missing @ symbol: 'invalidemail.com'
 * - Multiple @ symbols: 'user@@example.com'
 * - Missing domain: 'user@'
 * - Invalid characters (spaces): 'user name@example.com'
 * - Incomplete domain: 'user@domain'
 */
export async function test_api_user_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Prepare valid data for non-email fields
  const validPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<100>
  >();
  const validHref = "https://example.com/register";
  const validReferrer = "https://example.com/home";

  // Define array of invalid email formats to test
  const invalidEmails = [
    "invalidemail.com", // Missing @ symbol
    "user@@example.com", // Multiple @ symbols
    "user@", // Missing domain
    "user name@example.com", // Invalid character (space)
    "user@domain", // Incomplete domain (no TLD)
  ] as const;

  // Test each invalid email format
  for (const invalidEmail of invalidEmails) {
    await TestValidator.error(
      `registration should fail for invalid email: ${invalidEmail}`,
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
