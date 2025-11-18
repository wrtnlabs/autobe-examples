import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user registration functionality with valid email formats.
 *
 * This test validates that the user registration API works correctly with
 * properly formatted email addresses. Since the API contract enforces email
 * format validation at the type level (string & tags.Format<"email">), this
 * test focuses on ensuring the registration process completes successfully with
 * valid email addresses.
 *
 * Test scenarios:
 *
 * 1. Registration with randomly generated valid email addresses
 * 2. Verification of successful user creation and authentication
 * 3. Validation of response data structure and token generation
 */
export async function test_api_user_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Generate multiple valid email addresses for testing
  const validEmails = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"email">>(),
  );

  // Test registration with each valid email
  for (const validEmail of validEmails) {
    const user = await api.functional.auth.user.join(connection, {
      body: {
        email: validEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ITodoListUser.ICreate,
    });

    typia.assert(user);
    TestValidator.equals(
      "registered user email should match input",
      user.email,
      validEmail,
    );
    TestValidator.predicate(
      "user should have valid authentication token",
      typeof user.token.access === "string" && user.token.access.length > 0,
    );
    TestValidator.predicate(
      "user should have valid refresh token",
      typeof user.token.refresh === "string" && user.token.refresh.length > 0,
    );
    TestValidator.predicate(
      "user should have token expiration dates",
      typeof user.token.expired_at === "string" &&
        typeof user.token.refreshable_until === "string",
    );
    TestValidator.predicate(
      "user should have active status by default",
      user.status === "active",
    );
    TestValidator.predicate(
      "user should have creation timestamp",
      typeof user.created_at === "string" && user.created_at.length > 0,
    );
    TestValidator.predicate(
      "user should have update timestamp",
      typeof user.updated_at === "string" && user.updated_at.length > 0,
    );
  }

  // Test duplicate email registration should fail
  const duplicateEmail = typia.random<string & tags.Format<"email">>();

  // First registration should succeed
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: duplicateEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(firstUser);

  // Second registration with same email should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: duplicateEmail,
          password: RandomGenerator.alphaNumeric(12),
        } satisfies ITodoListUser.ICreate,
      });
    },
  );
}
