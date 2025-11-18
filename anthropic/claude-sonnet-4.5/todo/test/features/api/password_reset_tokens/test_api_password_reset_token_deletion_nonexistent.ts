import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetToken";

/**
 * Test deletion attempt for a non-existent password reset token.
 *
 * This test validates that the API properly handles attempts to delete password
 * reset tokens that don't exist in the database. It uses a randomly generated
 * UUID that was never created in the system to simulate scenarios where cleanup
 * operations or concurrent requests might target non-existent tokens.
 *
 * Steps:
 *
 * 1. Generate a random UUID that doesn't exist in the system
 * 2. Attempt to delete the non-existent token via the API
 * 3. Verify that an error is thrown (token not found)
 *
 * This ensures the system gracefully handles invalid token deletion attempts
 * without crashing or causing inconsistent state.
 */
export async function test_api_password_reset_token_deletion_nonexistent(
  connection: api.IConnection,
) {
  // Generate a random UUID that doesn't exist in the system
  const nonExistentTokenId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to delete the non-existent token - this should fail
  await TestValidator.error(
    "deletion of non-existent token should fail",
    async () => {
      await api.functional.todoList.passwordResetTokens.erase(connection, {
        tokenId: nonExistentTokenId,
      });
    },
  );
}
