import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that a reset token can only be used once.
 *
 * Validates the single-use enforcement of password reset tokens. After a token
 * has been successfully used to reset a password, attempting to use the same
 * token again with a different new password must fail, ensuring tokens cannot
 * be reused or replayed.
 *
 * Test flow:
 *
 * 1. Request a password reset for a member account via email
 * 2. Use the reset token with a valid new password to reset password
 * 3. Attempt to reuse the same token with a different new password
 * 4. Verify the second attempt fails with token already used error
 */
export async function test_api_member_password_reset_confirm_token_already_used(
  connection: api.IConnection,
) {
  // Step 1: Request a password reset for a member account
  const email = typia.random<string & tags.Format<"email">>();

  await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
    connection,
    {
      body: {
        email,
      } satisfies ICommunityPlatformMember.IPasswordResetRequest,
    },
  );

  // Step 2: Simulate obtaining a reset token
  // In a real scenario, this token would be sent via email
  const resetToken = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Generate valid passwords meeting security requirements
  // Password must have: minimum 8 chars, uppercase, lowercase, numbers, special chars
  const firstNewPassword = "SecurePass123!";
  const secondNewPassword = "DifferentPass456@";

  // Step 4: Use the reset token to successfully reset password
  const resetResponse: ICommunityPlatformMember.IPasswordResetConfirmResponse =
    await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: resetToken,
          password: firstNewPassword,
        } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
      },
    );

  typia.assert(resetResponse);
  TestValidator.equals(
    "email should match requested account",
    resetResponse.email,
    email,
  );
  TestValidator.predicate(
    "response should contain confirmation message",
    typeof resetResponse.message === "string" &&
      resetResponse.message.length > 0,
  );

  // Step 5: Attempt to reuse the same token with a different password
  await TestValidator.error(
    "reusing same token should fail with token already used error",
    async () => {
      await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: resetToken,
            password: secondNewPassword,
          } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
        },
      );
    },
  );
}
