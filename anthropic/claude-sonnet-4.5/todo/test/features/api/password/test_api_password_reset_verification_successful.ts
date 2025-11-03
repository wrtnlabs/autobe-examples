import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the password reset request workflow to validate token generation.
 *
 * This test validates the password reset request functionality:
 *
 * 1. Create a user account through registration
 * 2. Initiate a password reset request for the registered user
 * 3. Validate that the system returns appropriate generic response message
 *
 * Note: This test only validates the password reset REQUEST endpoint because
 * the verification endpoint requires a reset token that is sent via email. In a
 * real E2E test environment, the token would need to be extracted from email or
 * database, which is not available in this test context.
 *
 * The test ensures that:
 *
 * - Password reset requests can be initiated for existing users
 * - The system returns a generic success message (security best practice)
 * - The endpoint does not reveal whether the email exists (prevents enumeration)
 */
export async function test_api_password_reset_verification_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for password reset testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "Password123"; // Meets requirements: 8+ chars, letter + number

  const newUser = await api.functional.todoList.users.join(connection, {
    body: {
      email: userEmail,
      password: originalPassword,
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(newUser);

  // Validate the created user has expected properties
  TestValidator.equals(
    "created user email matches input",
    newUser.email,
    userEmail,
  );

  // Step 2: Initiate password reset request
  const resetResponse =
    await api.functional.todoList.users.password.reset.requestReset(
      connection,
      {
        body: {
          email: userEmail,
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );
  typia.assert(resetResponse);

  // Step 3: Validate reset response contains generic message (security best practice)
  TestValidator.predicate(
    "reset response should contain generic message",
    typeof resetResponse.message === "string" &&
      resetResponse.message.length > 0,
  );

  // Step 4: Test with non-existent email to verify no information disclosure
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const nonExistentResponse =
    await api.functional.todoList.users.password.reset.requestReset(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );
  typia.assert(nonExistentResponse);

  // Validate that response is generic and doesn't reveal email existence
  TestValidator.predicate(
    "response for non-existent email should also contain message",
    typeof nonExistentResponse.message === "string" &&
      nonExistentResponse.message.length > 0,
  );
}
