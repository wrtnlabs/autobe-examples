import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password reset rejection when token does not exist in database.
 *
 * This test validates that the password reset confirmation endpoint properly
 * rejects requests with invalid (non-existent) reset tokens. The endpoint must
 * query the todo_list_password_reset_tokens table, fail to find the provided
 * token, and reject the reset attempt with an appropriate error response.
 *
 * The test ensures that only legitimate tokens generated through the
 * reset-request endpoint are accepted, preventing unauthorized password changes
 * from forged or random tokens.
 *
 * Test flow:
 *
 * 1. Create a new user account for testing
 * 2. Generate a random/forged reset token that never existed
 * 3. Attempt password reset with the invalid token
 * 4. Verify the operation fails with appropriate error
 */
export async function test_api_password_reset_confirm_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "ValidPassword123!@#";

  const newUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: originalPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(newUser);
  TestValidator.equals("user created successfully", newUser.email, userEmail);

  // Step 2: Generate a random/forged reset token that never existed
  // Using a random alphanumeric string that simulates a token format
  const invalidToken = RandomGenerator.alphaNumeric(32);

  // Step 3: Attempt password reset with the invalid token
  const newPassword = "NewValidPassword456!@#";

  // Step 4: Verify the operation fails with appropriate error
  // The endpoint should reject the request because the token does not exist
  // in the todo_list_password_reset_tokens table
  await TestValidator.error("invalid token should be rejected", async () => {
    await api.functional.auth.user.password.reset_confirm.resetPasswordConfirm(
      connection,
      {
        body: {
          token: invalidToken,
          new_password: newPassword,
        } satisfies ITodoListUser.IPasswordResetConfirm,
      },
    );
  });
}
