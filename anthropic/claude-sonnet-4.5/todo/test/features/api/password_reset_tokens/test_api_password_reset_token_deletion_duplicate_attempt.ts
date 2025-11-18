import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test deletion of non-existent password reset token.
 *
 * This test validates error handling when attempting to delete a password reset
 * token that does not exist in the system. This scenario can occur in several
 * real-world situations:
 *
 * 1. Race condition where multiple cleanup processes attempt deletion
 * 2. Manual cleanup operations with stale token IDs
 * 3. Retry logic in distributed systems
 * 4. Client-side errors with incorrect token references
 *
 * The test ensures the system properly handles such cases with appropriate
 * error responses rather than crashing or returning misleading success
 * messages.
 *
 * Test Flow:
 *
 * 1. Generate a random UUID that represents a non-existent token
 * 2. Attempt to delete this non-existent token
 * 3. Verify that the deletion fails with an appropriate error
 *
 * Note: The original scenario requested testing duplicate deletion, but this is
 * not implementable because the password reset request API does not expose
 * token IDs in responses (by security design to prevent enumeration attacks).
 * This test validates the same error handling code path that would be triggered
 * by duplicate deletion attempts.
 */
export async function test_api_password_reset_token_deletion_duplicate_attempt(
  connection: api.IConnection,
) {
  // Generate a random token ID that does not exist in the system
  const nonExistentTokenId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to delete the non-existent token - should fail with error
  await TestValidator.error(
    "deleting non-existent token should fail",
    async () => {
      await api.functional.todoList.passwordResetTokens.erase(connection, {
        tokenId: nonExistentTokenId,
      });
    },
  );
}
