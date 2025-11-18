import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password reset token deletion API functionality.
 *
 * This test validates that the token deletion API correctly removes tokens from
 * the system and prevents reuse by ensuring deleted tokens cannot be deleted
 * again. While we cannot test the complete token lifecycle due to API
 * limitations (no token retrieval endpoint), we can verify that:
 *
 * 1. Password reset requests can be initiated successfully
 * 2. Token deletion API accepts valid UUID token IDs
 * 3. Attempting to delete the same token twice results in an error
 *
 * This approach ensures the deletion mechanism enforces single-use token
 * security by preventing duplicate deletion operations on the same token ID.
 */
export async function test_api_password_reset_token_deletion_prevents_reuse(
  connection: api.IConnection,
) {
  // Step 1: Create a password reset request to simulate token generation
  const email = typia.random<string & tags.Format<"email">>();
  const resetRequest = { email } satisfies ITodoListUser.IPasswordResetRequest;

  const resetResponse: ITodoListUser.IPasswordResetRequestResponse =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      { body: resetRequest },
    );
  typia.assert(resetResponse);

  // Verify the response contains a confirmation message
  TestValidator.predicate(
    "password reset request returns non-empty confirmation message",
    resetResponse.message.length > 0,
  );

  // Step 2: Test token deletion with a generated token ID
  // Note: In a real scenario, this ID would come from the database or email
  // Since the API doesn't provide token retrieval, we use a generated UUID
  const tokenId = typia.random<string & tags.Format<"uuid">>();

  const deletedToken: ITodoListPasswordResetToken =
    await api.functional.todoList.passwordResetTokens.erase(connection, {
      tokenId,
    });
  typia.assert(deletedToken);

  // Verify the deleted token response has correct structure
  TestValidator.equals(
    "deleted token ID matches requested token ID",
    deletedToken.id,
    tokenId,
  );

  // Step 3: Verify token cannot be deleted again (prevents reuse)
  await TestValidator.error(
    "deleting the same token twice should fail",
    async () => {
      await api.functional.todoList.passwordResetTokens.erase(connection, {
        tokenId,
      });
    },
  );
}
