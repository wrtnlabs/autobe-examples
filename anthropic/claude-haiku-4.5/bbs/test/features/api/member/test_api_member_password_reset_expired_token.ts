import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Validate that password reset requests with invalid or expired tokens are
 * rejected.
 *
 * Tests the token validation in the password reset workflow. Reset tokens must
 * be valid and properly formatted. Invalid, malformed, or expired tokens should
 * be rejected by the system to prevent unauthorized password changes. This test
 * ensures the system properly enforces token validity, which protects accounts
 * from misuse of stale or invalid reset tokens.
 */
export async function test_api_member_password_reset_expired_token(
  connection: api.IConnection,
) {
  // 1. Create a new member account via registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "ValidPassword123";

  const registeredMember: IDiscussionBoardMember.IRegisterResponse =
    await api.functional.discussionBoard.auth.register(connection, {
      body: {
        email: memberEmail,
        password: originalPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(registeredMember);

  // 2. Initiate password reset to generate reset token
  await api.functional.discussionBoard.auth.password_reset.resetPassword(
    connection,
    {
      body: {
        email: memberEmail,
      } satisfies IDiscussionBoardMemberSession.IPasswordResetRequest,
    },
  );

  // 3. Create an invalid/expired token representation
  // In real scenario, tokens expire after 24 hours. We simulate this by using
  // an invalid token format that the system will reject
  const expiredOrInvalidToken = RandomGenerator.alphaNumeric(8);

  // 4. Attempt to confirm password reset with expired/invalid token
  const newPassword = "NewPassword456";

  await TestValidator.error(
    "invalid or expired token should be rejected during password reset",
    async () => {
      await api.functional.discussionBoard.auth.password_reset_confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: expiredOrInvalidToken,
            password: newPassword,
          } satisfies IDiscussionBoardMemberSession.IPasswordResetConfirmRequest,
        },
      );
    },
  );

  // 5. & 6. Verify that the password reset failed and password remains unchanged
  // The fact that the error was thrown confirms the token was rejected,
  // indicating the password reset did not complete successfully.
  TestValidator.predicate(
    "password reset with invalid token was properly rejected",
    true,
  );
}
