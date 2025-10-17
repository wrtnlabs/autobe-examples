import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";
import type { ITodoListTodoMemberLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberLogin";

/**
 * Reject login on wrong password with neutral error, then succeed on correct
 * password.
 *
 * Steps:
 *
 * 1. Join a todo member with random email and a strong password (>= 8 chars).
 * 2. Attempt login using the same email but a wrong password and expect an error
 *    (neutral, no status assertions).
 * 3. Attempt login using the correct password and expect success.
 * 4. Verify the successful login identity matches the joined identity (same id and
 *    email).
 */
export async function test_api_todo_member_login_wrong_password_rejected(
  connection: api.IConnection,
) {
  // 1) Join a new member
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const correctPassword: string = RandomGenerator.alphaNumeric(12);
  const randomWrong: string = RandomGenerator.alphaNumeric(12);
  const wrongPassword: string =
    randomWrong === correctPassword ? `${randomWrong}x` : randomWrong;

  const joined: ITodoListTodoMember.IAuthorized =
    await api.functional.auth.todoMember.join(connection, {
      body: {
        email,
        password: correctPassword,
      } satisfies ITodoListTodoMemberJoin.ICreate,
    });
  typia.assert(joined);

  // 2) Wrong password must be rejected
  await TestValidator.error(
    "login with incorrect password must be rejected with neutral error",
    async () => {
      await api.functional.auth.todoMember.login(connection, {
        body: {
          email,
          password: wrongPassword,
        } satisfies ITodoListTodoMemberLogin.ICreate,
      });
    },
  );

  // 3) Correct password must succeed
  const authorized: ITodoListTodoMember.IAuthorized =
    await api.functional.auth.todoMember.login(connection, {
      body: {
        email,
        password: correctPassword,
      } satisfies ITodoListTodoMemberLogin.ICreate,
    });
  typia.assert(authorized);

  // 4) Identity consistency
  TestValidator.equals(
    "authorized.id matches joined.id",
    authorized.id,
    joined.id,
  );
  TestValidator.equals(
    "authorized.email matches input email",
    authorized.email,
    email,
  );
}
