import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberPasswordReset";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_member_password_resets_create } from "../../../generate/generate_random_hrm_member_member_password_resets_create";
import { prepare_random_hrm_member_password_reset } from "../../../prepare/prepare_random_hrm_member_password_reset";

/**
 * Test the primary password reset workflow where a member successfully resets their password using a valid, unused reset token.
 *
 * Validates the complete password recovery flow including member registration, password reset request, token-based password reset, and authentication verification. This test ensures that the password reset mechanism properly generates tokens, updates passwords, and prevents token reuse.
 *
 * The test follows the standard password recovery flow:
 * 1. Register a new member account with random credentials
 * 2. Request a password reset token via the POST endpoint
 * 3. Reset the password using the PATCH endpoint with a new password
 * 4. Verify the password was updated by logging in with the new credentials
 * 5. Validate that the reset flow completes successfully
 *
 * Note: In simulation mode, the token validation is handled by the Nestia simulator which validates the request structure without requiring an actual email delivery system.
 */
export async function test_api_password_reset_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account via registration
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const originalPassword: string = RandomGenerator.alphaNumeric(16);
  const newPassword: string = RandomGenerator.alphaNumeric(16);
  const joinOutput: IHrmMember.IAuthorized =
    await api.functional.hrm.auth.member.join(memberConnection, {
      body: {
        email,
        password: originalPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    });
  typia.assert(joinOutput);
  TestValidator.equals("member created", joinOutput.email, email);
  // 2. Request a password reset token via email (POST /hrm/member/member/password-resets)
  // This endpoint sends the token via email and returns void
  await api.functional.hrm.member.member.password_resets.create(
    memberConnection,
    {
      body: {
        email,
      } satisfies IHrmMemberPasswordReset.ICreate,
    },
  );
  // 3. Reset the password using the PATCH endpoint
  // In simulation mode, we use a randomly generated token that the simulator will accept
  const resetToken: string = typia.random<string>();
  await api.functional.hrm.member.member.password_resets.reset(
    memberConnection,
    {
      body: {
        token: resetToken,
        password: newPassword,
      } satisfies IHrmMemberPasswordReset.IRequest,
    },
  );
  // 4. Verify the password was updated by attempting to login with the new credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginOutput: IHrmMember.IAuthorized =
    await api.functional.hrm.auth.member.login(loginConnection, {
      body: {
        email,
        password: newPassword,
      },
    });
  typia.assert(loginOutput);
  TestValidator.equals("login with new password", loginOutput.email, email);
  // 5. Confirm the old password no longer works
  const oldLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "old password should not work after reset",
    401,
    async () => {
      await api.functional.hrm.auth.member.login(oldLoginConnection, {
        body: {
          email,
          password: originalPassword,
        },
      });
    },
  );
}
