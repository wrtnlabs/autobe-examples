import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test password reset confirmation with an invalid token.
 *
 * This test validates that the password reset confirmation endpoint properly
 * rejects attempts to reset passwords using invalid or non-existent tokens.
 *
 * The test generates a random UUID that doesn't exist in the
 * discussion_board_password_resets table and attempts to use it for password
 * reset confirmation. The system should reject this request with an appropriate
 * error, ensuring that only valid tokens (generated through the proper password
 * reset request flow) can be used to reset passwords.
 *
 * This security validation ensures that attackers cannot brute-force or
 * fabricate reset tokens to gain unauthorized access to moderator accounts.
 *
 * Steps:
 *
 * 1. Generate a random UUID token (guaranteed not to exist in database)
 * 2. Create a valid password meeting security requirements
 * 3. Attempt password reset confirmation with invalid token
 * 4. Validate that the operation fails with an error
 */
export async function test_api_moderator_password_reset_confirm_invalid_token(
  connection: api.IConnection,
) {
  // Generate a random UUID that doesn't exist in the database
  const invalidToken = typia.random<string & tags.Format<"uuid">>();

  // Generate a valid password meeting minimum security requirements (MinLength<8>)
  const newPassword = typia.random<string & tags.MinLength<8>>();

  // Attempt to reset password with the invalid token
  // This should fail because the token doesn't exist in discussion_board_password_resets
  await TestValidator.error(
    "password reset should fail with invalid token",
    async () => {
      await api.functional.auth.moderator.password.reset.confirm.resetPassword(
        connection,
        {
          body: {
            token: invalidToken,
            password: newPassword,
          } satisfies IDiscussionBoardModerator.IResetPassword,
        },
      );
    },
  );
}
