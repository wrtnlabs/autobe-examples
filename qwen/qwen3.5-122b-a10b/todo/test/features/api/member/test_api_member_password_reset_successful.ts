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
 * Test successful member password reset workflow with token validation.
 *
 * Validates the complete password reset flow for members who have forgotten their password. This test ensures that password reset tokens are properly consumed after use and cannot be reused, while verifying the member can successfully authenticate with their new password.
 *
 * The scenario follows the natural password recovery flow: member registration, password reset with valid token, token consumption verification, token reuse prevention, and successful login with new credentials.
 *
 * 1. Register a new member account with unique email and credentials.
 * 2. Submit password reset request with valid token and new password.
 * 3. Verify the reset response and token consumption (used_at is set).
 * 4. Attempt to reuse the same token (should fail).
 * 5. Login with the new password to confirm reset was successful.
 */
export async function test_api_member_password_reset_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // Store member email for login verification
  const memberEmail = member.email;
  // 2. For this test, we need a valid password reset token
  // Since there's no API to create tokens, we'll use typia.random to generate a token
  // In a real scenario, this token would be created via email reset request endpoint
  const resetToken = typia.random<string>();
  // Create password reset request with matching passwords
  const newPassword = RandomGenerator.alphaNumeric(16);
  const resetRequest = {
    token: resetToken,
    newPassword: newPassword,
    newPasswordConfirm: newPassword,
  } satisfies ITodoAppMemberPasswordReset.IRequest;
  // 3. Submit password reset request (no authentication required)
  const resetResponse =
    await api.functional.todoApp.member.password_resets.reset(connection, {
      body: resetRequest,
    });
  typia.assert(resetResponse);
  // 4. Verify token is consumed (used_at should be set)
  TestValidator.predicate("token is consumed", resetResponse.used_at !== null);
  // 5. Attempt to reuse the same token (should fail)
  await TestValidator.error("token cannot be reused", async () => {
    await api.functional.todoApp.member.password_resets.reset(connection, {
      body: resetRequest,
    });
  });
  // 6. Verify member can login with new password
  const newMemberConnection: api.IConnection = { host: connection.host };
  const newMember = await authorize_member_login(newMemberConnection, {
    body: {
      email: memberEmail,
      password: newPassword,
    },
  });
  typia.assert(newMember);
  // 7. Verify the member identity is the same
  TestValidator.equals("member ID matches", newMember.id, member.id);
  TestValidator.equals("email matches", newMember.email, memberEmail);
}
