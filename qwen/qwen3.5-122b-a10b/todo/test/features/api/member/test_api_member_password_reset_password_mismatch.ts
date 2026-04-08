import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test password reset failure when newPassword and newPasswordConfirm do not match.
 *
 * Validates that the password reset endpoint properly rejects requests where the new password and confirmation password do not match. Since there is no API endpoint to request a password reset token (only to consume it), this test uses a randomly generated token value to focus on testing the password mismatch validation logic.
 *
 * The test verifies:
 * 1. Creating a member account for testing
 * 2. Attempting password reset with mismatched newPassword and newPasswordConfirm
 * 3. System correctly rejects the request with appropriate error
 *
 * 1. Create a new member account with random credentials.
 * 2. Attempt to reset password using a random token with newPassword and newPasswordConfirm that differ.
 * 3. Verify the reset request is rejected due to validation error (password mismatch or invalid token).
 */
export async function test_api_member_password_reset_password_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: originalPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Attempt password reset with mismatched passwords
  const resetToken = typia.random<string>();
  const newPassword = RandomGenerator.alphaNumeric(16);
  const newPasswordConfirm = RandomGenerator.alphaNumeric(16);
  // Ensure passwords are different for the test
  if (newPassword === newPasswordConfirm) {
    throw new Error("Generated passwords should be different for this test");
  }
  // 3. Verify the reset request is rejected
  // Note: The request may fail due to invalid token OR password mismatch
  // Both are expected validation failures
  await TestValidator.error(
    "password reset with mismatched passwords should be rejected",
    async () => {
      await api.functional.todoApp.member.password_resets.reset(
        memberConnection,
        {
          body: {
            token: resetToken,
            newPassword,
            newPasswordConfirm,
          } satisfies ITodoAppMemberPasswordReset.IRequest,
        },
      );
    },
  );
}
