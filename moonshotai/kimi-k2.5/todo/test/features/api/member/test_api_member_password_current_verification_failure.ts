import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Verify that password change requires correct current password authentication.
 * When incorrect current password is provided:
 * - The system rejects with authentication error (401 or 403)
 * - The existing password remains unchanged
 * - The member can still authenticate with the original password
 */
export async function test_api_member_password_current_verification_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member with known password
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      password: originalPassword,
    },
  });
  typia.assert(member);
  // 2. Attempt password change with WRONG current password
  // This should fail with authentication error
  await TestValidator.httpError(
    "password update with incorrect current password must fail",
    [401, 403],
    async () => {
      await api.functional.multiUserTodo.member.password.updatePassword(
        memberConnection,
        {
          body: {
            current_password: RandomGenerator.alphaNumeric(16) + "wrong",
            new_password: RandomGenerator.alphaNumeric(16) + "newpass",
          } satisfies IMultiUserTodoMember.IUpdatePassword,
        },
      );
    },
  );
  // 3. Verify original password still works by successfully updating with correct current password
  const updatedMember =
    await api.functional.multiUserTodo.member.password.updatePassword(
      memberConnection,
      {
        body: {
          current_password: originalPassword,
          new_password: RandomGenerator.alphaNumeric(16) + "updated",
        } satisfies IMultiUserTodoMember.IUpdatePassword,
      },
    );
  typia.assert(updatedMember);
  // 4. Verify member identity is preserved
  TestValidator.equals("member ID preserved", updatedMember.id, member.id);
  TestValidator.equals(
    "member email preserved",
    updatedMember.email,
    member.email,
  );
}
