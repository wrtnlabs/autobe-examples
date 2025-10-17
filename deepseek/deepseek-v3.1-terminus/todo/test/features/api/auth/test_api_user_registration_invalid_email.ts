import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMinimalTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoUser";

/**
 * Test user registration with invalid email formats to validate proper error
 * handling.
 *
 * This test validates that the user registration API properly rejects invalid
 * email formats and provides appropriate error responses. Various email
 * patterns that violate standard email format requirements are tested,
 * including malformed addresses, missing domain parts, and invalid characters.
 *
 * The test ensures that the system maintains security by not revealing
 * sensitive information about existing accounts while providing clear error
 * indications for invalid email inputs.
 */
export async function test_api_user_registration_invalid_email(
  connection: api.IConnection,
) {
  // Define various invalid email patterns to test
  const invalidEmails = [
    "plaintext", // Missing @ and domain
    "user@", // Missing domain part
    "@example.com", // Missing local part
    "user@domain", // Missing top-level domain
    "user@.com", // Missing domain name
    "user@domain..com", // Double dots in domain
    "user@-domain.com", // Domain starts with hyphen
    "user@domain-.com", // Domain ends with hyphen
    "user@domain.c", // TLD too short
    "user@domain.123", // Numeric TLD not allowed
    "user@domain.com.", // Trailing dot
    "user..name@domain.com", // Double dots in local part
    "user name@domain.com", // Space in email
    "user@domain com", // Space in domain
    "user@[123.456.789.123]", // Invalid IP format
    "user@[IPv6:2001:db8::1]", // Invalid IPv6 format
    "user@domain.c_o_m", // Invalid characters in TLD
    "user@domain.c@m", // Multiple @ symbols
    "user@domain.com@", // Trailing @
    "user@domain.com.", // Trailing dot
    "user@domain..com", // Double dots
    "user@-domain.com", // Hyphen at domain start
    "user@domain-.com", // Hyphen at domain end
    "user@.domain.com", // Leading dot in domain
    "user@domain.com.", // Trailing dot in domain
    "user@domain.c", // Invalid TLD length
    "user@domain.123", // Numeric TLD
    "user@domain.c-o-m", // Hyphens in TLD
    "user@domain.c_o_m", // Underscore in TLD
    "user@domain.c@m", // Special char in TLD
    "user@domain.c m", // Space in TLD
  ];

  // Test each invalid email pattern
  for (const invalidEmail of invalidEmails) {
    await TestValidator.error(
      `email format validation for: ${invalidEmail}`,
      async () => {
        await api.functional.auth.user.join(connection, {
          body: {
            email: invalidEmail,
            password: "validPassword123",
          } satisfies IMinimalTodoUser.ICreate,
        });
      },
    );
  }

  // Test additional edge cases with more complex invalid patterns
  const complexInvalidEmails = [
    "user@domain.c", // Single character TLD
    "user@domain.123456", // Long numeric TLD
    "user@domain.c-o-m", // Hyphenated TLD
    "user@domain.c_o_m", // Underscore TLD
    "user@domain.c@m", // Special character TLD
    "user@domain.c m", // Space in TLD
    "user@domain.com-", // Trailing hyphen
    "user@domain.com_", // Trailing underscore
    "user@domain.com.", // Just trailing dot
    "user@domain.com..", // Multiple trailing dots
    "user@domain.com@example", // Multiple @ symbols with content
    "user@domain.com@example.com", // Nested @ symbols
  ];

  // Test complex invalid email patterns
  for (const invalidEmail of complexInvalidEmails) {
    await TestValidator.error(
      `complex email validation for: ${invalidEmail}`,
      async () => {
        await api.functional.auth.user.join(connection, {
          body: {
            email: invalidEmail,
            password: "anotherValidPassword456",
          } satisfies IMinimalTodoUser.ICreate,
        });
      },
    );
  }

  // Test with valid email format to ensure the API works correctly with valid input
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "validPassword789";

  const validUser = await api.functional.auth.user.join(connection, {
    body: {
      email: validEmail,
      password: validPassword,
    } satisfies IMinimalTodoUser.ICreate,
  });

  typia.assert(validUser);
  TestValidator.predicate(
    "valid user registration should succeed",
    validUser.id !== undefined && validUser.id.length > 0,
  );
}
