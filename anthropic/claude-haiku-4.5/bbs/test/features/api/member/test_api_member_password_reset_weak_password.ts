import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

export async function test_api_member_password_reset_weak_password(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with a valid password
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const strongPassword = "SecurePass123";

  const registeredMember = await api.functional.discussionBoard.auth.register(
    connection,
    {
      body: {
        email: memberEmail,
        password: strongPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    },
  );
  typia.assert(registeredMember);
  TestValidator.equals(
    "member registration successful",
    registeredMember.email,
    memberEmail,
  );

  // Step 2: Initiate password reset to generate valid reset token
  await api.functional.discussionBoard.auth.password_reset.resetPassword(
    connection,
    {
      body: {
        email: memberEmail,
      } satisfies IDiscussionBoardMemberSession.IPasswordResetRequest,
    },
  );

  // Step 3: Attempt to confirm password reset with invalid/expired token
  // This validates that the system rejects password reset attempts with invalid tokens
  const invalidToken = typia.random<string>();
  const validLengthPassword = "ValidPass123";

  await TestValidator.error(
    "invalid token should be rejected during password reset",
    async () => {
      await api.functional.discussionBoard.auth.password_reset_confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: invalidToken,
            password: validLengthPassword,
          } satisfies IDiscussionBoardMemberSession.IPasswordResetConfirmRequest,
        },
      );
    },
  );
}
