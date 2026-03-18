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

export async function test_api_password_reset_expired_token_rejected_without_password_change(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const originalPassword = typia.random<boolean>();
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: originalPassword,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(joined);
  const attemptedNewPassword = typia.random<string & tags.MinLength<1>>();
  const expiredToken = typia.random<string & tags.MinLength<1>>();
  const resetRequest = {
    token: expiredToken,
    password: attemptedNewPassword,
    page: null,
    limit: null,
  } satisfies IMultiUserTodoMemberPasswordReset.IRequest;
  await TestValidator.error(
    "expired password reset token should be rejected",
    async () => {
      const result =
        await api.functional.multiUserTodo.member.password_resets.processPasswordResets(
          memberConnection,
          {
            body: resetRequest,
          },
        );
      typia.assert(result);
    },
  );
  await TestValidator.error(
    "expired token must remain unusable on reuse",
    async () => {
      const result =
        await api.functional.multiUserTodo.member.password_resets.processPasswordResets(
          memberConnection,
          {
            body: resetRequest,
          },
        );
      typia.assert(result);
    },
  );
}
