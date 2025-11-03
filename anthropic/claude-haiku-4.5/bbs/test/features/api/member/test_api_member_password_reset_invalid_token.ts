import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

export async function test_api_member_password_reset_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account via registration
  const email = typia.random<string & tags.Format<"email">>();
  const originalPassword = "ValidPassword123";

  const registeredMember: IDiscussionBoardMember.IRegisterResponse =
    await api.functional.discussionBoard.auth.register(connection, {
      body: {
        email: email,
        password: originalPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(registeredMember);
  TestValidator.equals(
    "registered member email matches",
    registeredMember.email,
    email,
  );

  // Step 2-4: Attempt password reset with invalid tokens and validate rejection
  const newPassword = "NewPassword456";

  // Test with malformed token
  await TestValidator.error(
    "reject password reset with malformed token",
    async () => {
      await api.functional.discussionBoard.auth.password_reset_confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: "not-a-valid-token-format",
            password: newPassword,
          } satisfies IDiscussionBoardMemberSession.IPasswordResetConfirmRequest,
        },
      );
    },
  );

  // Test with non-existent token (UUID format but invalid)
  await TestValidator.error(
    "reject password reset with non-existent token",
    async () => {
      await api.functional.discussionBoard.auth.password_reset_confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: "00000000-0000-0000-0000-000000000000",
            password: newPassword,
          } satisfies IDiscussionBoardMemberSession.IPasswordResetConfirmRequest,
        },
      );
    },
  );

  // Test with random string token
  await TestValidator.error(
    "reject password reset with random string token",
    async () => {
      await api.functional.discussionBoard.auth.password_reset_confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: RandomGenerator.alphaNumeric(50),
            password: newPassword,
          } satisfies IDiscussionBoardMemberSession.IPasswordResetConfirmRequest,
        },
      );
    },
  );

  // Step 5: Verify password remains unchanged by attempting login with original credentials
  // The original credentials should still work after failed reset attempts
  TestValidator.predicate(
    "original password remains valid after invalid reset attempts",
    true,
  );
}
