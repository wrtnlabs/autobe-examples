import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test case-insensitive email handling in user registration.
 *
 * Validates that the authentication system properly handles email
 * case-insensitivity:
 *
 * - Emails are stored in lowercase format for consistency
 * - Duplicate detection works case-insensitively
 * - Attempting to register with the same email in different cases fails
 *
 * This test ensures security and usability by preventing account duplication
 * through case-sensitive email confusion.
 *
 * Steps:
 *
 * 1. Register first user with mixed-case email 'User@Example.COM'
 * 2. Verify the registered user's email is stored in lowercase
 * 3. Attempt to register second user with lowercase version of same email
 * 4. Confirm the registration fails due to duplicate email detection
 */
export async function test_api_user_registration_email_case_insensitivity(
  connection: api.IConnection,
) {
  // 1. Register first user with mixed-case email
  const mixedCaseEmail = "User@Example.COM";
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: mixedCaseEmail,
      password: "SecurePassword123",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "192.168.1.1",
      user_agent: "Mozilla/5.0",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(firstUser);

  // 2. Verify the email is stored in lowercase
  TestValidator.equals(
    "registered email should be lowercase",
    firstUser.email,
    mixedCaseEmail.toLowerCase(),
  );

  // 3. Attempt to register second user with lowercase version of same email
  const lowercaseEmail = "user@example.com";
  await TestValidator.error(
    "duplicate email should be rejected case-insensitively",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: lowercaseEmail,
          password: "AnotherPassword456",
          href: "https://example.com/register",
          referrer: "https://example.com",
          ip: "192.168.1.2",
          user_agent: "Mozilla/5.0",
        } satisfies ITodoListUser.ICreate,
      });
    },
  );

  // 4. Test with uppercase variation to further verify case-insensitivity
  const uppercaseEmail = "USER@EXAMPLE.COM";
  await TestValidator.error(
    "uppercase email variant should also be rejected",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: uppercaseEmail,
          password: "ThirdPassword789",
          href: "https://example.com/register",
          referrer: "https://example.com",
          ip: "192.168.1.3",
          user_agent: "Mozilla/5.0",
        } satisfies ITodoListUser.ICreate,
      });
    },
  );
}
