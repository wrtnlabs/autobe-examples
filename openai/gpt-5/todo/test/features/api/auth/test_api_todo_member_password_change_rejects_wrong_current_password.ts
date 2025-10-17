import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";
import type { ITodoListTodoMemberPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberPassword";

/**
 * Ensure password change rejects wrong current password and does not alter
 * credentials.
 *
 * Workflow:
 *
 * 1. Register a todoMember (join) to obtain authenticated context (SDK sets
 *    Authorization automatically).
 * 2. Invoke password change with an incorrect current password; expect an error
 *    (neutral failure).
 * 3. Invoke password change with the correct current password; expect success.
 * 4. Try using the old (now outdated) password as current_password again; expect
 *    error, proving rotation took effect.
 *
 * Notes:
 *
 * - Do not validate HTTP status codes or error bodies.
 * - Use typia.assert for response typing only; no additional type checks.
 * - Never touch connection.headers; rely on SDK behavior from join.
 */
export async function test_api_todo_member_password_change_rejects_wrong_current_password(
  connection: api.IConnection,
) {
  // 1) Register a new member (authenticated context will be set by SDK)
  const email = typia.random<string & tags.Format<"email">>();
  const originalPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();

  const joined: ITodoListTodoMember.IAuthorized =
    await api.functional.auth.todoMember.join(connection, {
      body: {
        email,
        password: originalPassword,
      } satisfies ITodoListTodoMemberJoin.ICreate,
    });
  typia.assert(joined);

  // 2) Attempt to change password with an incorrect current password
  const wrongCurrentPassword: string = `${originalPassword}${RandomGenerator.alphaNumeric(3)}`;
  const candidateNewPassword1 = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();

  await TestValidator.error(
    "rejects password change when current password is incorrect",
    async () => {
      await api.functional.auth.todoMember.password.changePassword(connection, {
        body: {
          current_password: wrongCurrentPassword,
          new_password: candidateNewPassword1,
        } satisfies ITodoListTodoMemberPassword.IUpdate,
      });
    },
  );

  // 3) Change password with the correct current password (proves no state change from step 2)
  const candidateNewPassword2: string = `${candidateNewPassword1}${RandomGenerator.alphaNumeric(2)}`; // still >= 8
  const security: ITodoListTodoMember.ISecurity =
    await api.functional.auth.todoMember.password.changePassword(connection, {
      body: {
        current_password: originalPassword,
        new_password: candidateNewPassword2,
      } satisfies ITodoListTodoMemberPassword.IUpdate,
    });
  typia.assert(security);
  TestValidator.equals(
    "password change succeeds with correct current password",
    security.success,
    true,
  );

  // 4) Verify old password no longer works as current password (rotation took effect)
  const candidateNewPassword3 = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  await TestValidator.error(
    "old password should be invalid after rotation",
    async () => {
      await api.functional.auth.todoMember.password.changePassword(connection, {
        body: {
          current_password: originalPassword,
          new_password: candidateNewPassword3,
        } satisfies ITodoListTodoMemberPassword.IUpdate,
      });
    },
  );
}
