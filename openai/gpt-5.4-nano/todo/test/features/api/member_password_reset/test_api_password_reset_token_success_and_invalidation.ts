import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_token_success_and_invalidation(
  connection: api.IConnection,
): Promise<void> {
  // Create member via join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password1 = RandomGenerator.alphaNumeric(12);
  const password2 = RandomGenerator.alphaNumeric(14);
  const password3 = RandomGenerator.alphaNumeric(16);

  // IMultiUserTodoMember.IJoin expects `password?: boolean | undefined`
  const joined: IMultiUserTodoMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email,
        password: (password1.length > 0) satisfies boolean,
      } satisfies IMultiUserTodoMember.IJoin,
    },
  );

  typia.assert(joined);

  // Obtain reset token from environment (test harness responsibility)
  const resetTokenEnv: string | undefined =
    process.env.MULTIUSER_TODO_MEMBER_RESET_TOKEN ??
    process.env.MULTIUSER_TODO_PASSWORD_RESET_TOKEN;

  if (resetTokenEnv !== undefined) {
    const resetToken = resetTokenEnv satisfies string & tags.MinLength<1>;

    // Scenario A: success
    const resetConnection: api.IConnection = { host: connection.host };
    const reset1: IMultiUserTodoMemberPasswordReset.ISuccess =
      await api.functional.multiUserTodo.member.password_resets.processPasswordResets(
        resetConnection,
        {
          body: {
            token: resetToken,
            password: password2,
          } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
        },
      );

    typia.assert(reset1);
    TestValidator.equals("reset success", reset1.success, true);

    // Scenario B: reuse same token must be rejected
    await TestValidator.error(
      "reusing reset token must be rejected",
      async () => {
        const reset2Connection: api.IConnection = { host: connection.host };
        await api.functional.multiUserTodo.member.password_resets.processPasswordResets(
          reset2Connection,
          {
            body: {
              token: resetToken,
              password: password3,
            } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
          },
        );
      },
    );
  }

  // Scenario C: invalid/expired/revoked/non-existent token must be rejected
  const invalidTokens: string[] = ArrayUtil.repeat(4, () =>
    RandomGenerator.alphaNumeric(28),
  );

  for (const invalidToken of invalidTokens) {
    const invalidResetToken = invalidToken satisfies string & tags.MinLength<1>;

    await TestValidator.error(
      "reset with invalid token must be rejected",
      async () => {
        const resetInvalidConnection: api.IConnection = {
          host: connection.host,
        };

        await api.functional.multiUserTodo.member.password_resets.processPasswordResets(
          resetInvalidConnection,
          {
            body: {
              token: invalidResetToken,
              password: password2,
            } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
          },
        );
      },
    );
  }
}
