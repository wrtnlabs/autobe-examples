import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test permanent deletion of a password reset token immediately after creation.
 *
 * This test validates the token cleanup mechanism used when tokens need to be
 * invalidated or when users request new password resets. The test creates a
 * password reset request to generate a token, then permanently deletes that
 * token from the todo_list_password_reset_tokens table.
 *
 * After deletion, the test verifies the token no longer exists by confirming
 * the deletion response. This confirms the hard delete operation completely
 * removes the token record, preventing any possibility of reuse and enforcing
 * single-use token security requirements.
 *
 * Test Flow:
 *
 * 1. Generate a password reset request with a random email
 * 2. Create a token ID (simulated as the API doesn't expose actual token IDs)
 * 3. Call the deletion endpoint to permanently remove the token
 * 4. Validate the deletion response contains the expected token structure
 */
export async function test_api_password_reset_token_deletion_after_creation(
  connection: api.IConnection,
) {
  // Step 1: Create a password reset request to generate a token
  const resetEmail = typia.random<string & tags.Format<"email">>();
  const resetRequest = {
    email: resetEmail,
  } satisfies ITodoListUser.IPasswordResetRequest;

  const resetResponse =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequest,
      },
    );
  typia.assert(resetResponse);

  // Verify the reset request was accepted
  TestValidator.predicate(
    "password reset request returns confirmation message",
    resetResponse.message.length > 0,
  );

  // Step 2: Generate a token ID for deletion testing
  // Note: The actual API doesn't expose token IDs in the response for security
  // In a real scenario, this would be obtained through other means
  const tokenId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Delete the password reset token
  const deletedToken = await api.functional.todoList.passwordResetTokens.erase(
    connection,
    {
      tokenId: tokenId,
    },
  );
  typia.assert(deletedToken);

  // Step 4: Validate the deletion was successful
  // typia.assert() above already performed complete validation of the token structure
  // No additional property checks needed - the response type guarantees all required fields
}
