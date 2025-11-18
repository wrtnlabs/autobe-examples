import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that passwords shorter than the 8-character minimum are rejected during
 * user registration.
 *
 * This test validates that the user registration endpoint enforces password
 * minimum length requirements. It attempts to register users with passwords of
 * various lengths below the 8-character minimum (0, 1, 3, 7 characters) and
 * verifies that each attempt is rejected with an appropriate error response. No
 * user accounts should be created with insufficient passwords, ensuring the
 * security constraint is properly enforced.
 *
 * Test steps:
 *
 * 1. Attempt registration with 0-character password (empty string)
 * 2. Attempt registration with 1-character password
 * 3. Attempt registration with 3-character password
 * 4. Attempt registration with 7-character password
 * 5. Validate all attempts fail with error responses
 * 6. Attempt registration with valid 8-character password to confirm API is
 *    functional
 */
export async function test_api_user_registration_password_minimum_length(
  connection: api.IConnection,
) {
  const invalidPasswordLengths = [0, 1, 3, 7];

  // Test each invalid password length
  for (const length of invalidPasswordLengths) {
    const shortPassword = RandomGenerator.alphabets(length);
    const testEmail = typia.random<string & tags.Format<"email">>();

    await TestValidator.error(
      `registration should fail with ${length}-character password`,
      async () => {
        await api.functional.auth.user.join(connection, {
          body: {
            email: testEmail,
            password: shortPassword,
            href: "https://example.com/register",
            referrer: "https://example.com",
          } satisfies ITodoListUser.ICreate,
        });
      },
    );
  }

  // Verify API works with valid 8-character password
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = RandomGenerator.alphabets(8);

  const result = await api.functional.auth.user.join(connection, {
    body: {
      email: validEmail,
      password: validPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoListUser.ICreate,
  });

  typia.assert(result);
  TestValidator.equals(
    "successful registration returns authorized user with email",
    result.email,
    validEmail,
  );
}
