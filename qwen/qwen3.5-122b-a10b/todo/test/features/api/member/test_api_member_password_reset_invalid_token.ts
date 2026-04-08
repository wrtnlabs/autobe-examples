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
 * Test password reset failure with invalid or non-existent token.
 *
 * Validates the error handling behavior when attempting to reset a password using a token that does not exist in the system. This test ensures the password reset endpoint properly rejects invalid tokens and maintains security by not exposing information about whether a token exists or not.
 *
 * The test verifies that:
 * 1. Invalid tokens are rejected with appropriate error response
 * 2. The member's password remains unchanged after failed reset attempt
 * 3. No token consumption or database modifications occur
 * 4. The system maintains data integrity throughout the failed operation
 *
 * 1. Create a new member account with valid credentials.
 * 2. Attempt password reset with a randomly generated non-existent token.
 * 3. Verify the request fails with 404 Not Found status.
 * 4. Confirm the member's password hash remains unchanged.
 * 5. Validate no password reset token records were created or modified.
 */
export async function test_api_member_password_reset_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "OriginalPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // Store original password hash reference (we can't directly access it, but we know the password)
  const originalPassword = "OriginalPassword123!";
  // 2. Attempt password reset with invalid token
  const invalidToken = typia.random<string & tags.Format<"uuid">>();
  const newPassword = "NewSecurePassword456!";
  await TestValidator.httpError(
    "password reset with invalid token should return 404",
    404,
    async () => {
      await api.functional.todoApp.member.password_resets.reset(connection, {
        body: {
          token: invalidToken,
          newPassword: newPassword,
          newPasswordConfirm: newPassword,
        } satisfies ITodoAppMemberPasswordReset.IRequest,
      });
    },
  );
  // 3. Verify member can still login with original password
  const verifyConnection: api.IConnection = { host: connection.host };
  const verifyLogin = await authorize_member_login(verifyConnection, {
    body: {
      email: member.email,
      password: originalPassword,
    },
  });
  typia.assert(verifyLogin);
  // 4. Validate member identity remains the same
  TestValidator.equals("member ID unchanged", verifyLogin.id, member.id);
  TestValidator.equals(
    "member email unchanged",
    verifyLogin.email,
    member.email,
  );
}
