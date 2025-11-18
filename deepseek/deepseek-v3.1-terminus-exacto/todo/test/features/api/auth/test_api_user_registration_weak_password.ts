import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user registration with weak password that doesn't meet security
 * requirements. Attempt to register with passwords that are too short, lack
 * character diversity, or use common patterns. Verify that the system enforces
 * password strength policies and rejects weak passwords with appropriate
 * validation errors.
 */
export async function test_api_user_registration_weak_password(
  connection: api.IConnection,
) {
  // Define weak password test cases covering various failure scenarios
  const weakPasswords = [
    "123", // Too short (minimum length violation)
    "password", // Common dictionary word
    "12345678", // Only numeric characters
    "abcdefgh", // Only alphabetic characters
    "a", // Single character (extreme shortness)
    "", // Empty password
    "         ", // Only whitespace characters
    "abc123", // Short alphanumeric pattern
    "qwerty", // Keyboard sequence pattern
    "11111111", // Repeated single digit
    "aaaaaaaa", // Repeated single character
  ] as const;

  // Test each weak password scenario - all should be rejected
  for (const weakPassword of weakPasswords) {
    const testEmail = typia.random<string & tags.Format<"email">>();

    await TestValidator.error(
      `password "${weakPassword}" should be rejected as weak`,
      async () => {
        await api.functional.auth.user.join(connection, {
          body: {
            email: testEmail,
            password: weakPassword,
          } satisfies ITodoListUser.ICreate,
        });
      },
    );
  }

  // Test a strong password to ensure valid registration works correctly
  // Strong password includes uppercase, lowercase, numbers, and special characters
  const strongPassword = "StrongPass123!@#";
  const validEmail = typia.random<string & tags.Format<"email">>();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: validEmail,
      password: strongPassword,
    } satisfies ITodoListUser.ICreate,
  });

  typia.assert(user);
  TestValidator.equals(
    "registered user email matches input email",
    user.email,
    validEmail,
  );
  TestValidator.predicate(
    "user should have valid non-empty authentication tokens",
    user.token.access.length > 0 && user.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "user account should be created with active status",
    user.status === "active",
  );
}
