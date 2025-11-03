import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Cross-user update must be denied for personal todos.
 *
 * Flow:
 *
 * 1. Join as User A (SDK sets Authorization automatically)
 * 2. Create a todo as User A and capture its id
 * 3. Join as User B (new account; SDK switches Authorization)
 * 4. Attempt to update A's todo as B and expect an error
 *    (authorization/availability denial)
 *
 * Notes:
 *
 * - No login/read endpoints provided; do not attempt to switch back to A or
 *   re-fetch the todo.
 * - Do not touch connection.headers; SDK manages tokens.
 */
export async function test_api_todo_update_cross_user_access_denied(
  connection: api.IConnection,
) {
  // 1) Join as User A
  const joinABody = {
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: typia.assert<
      string &
        tags.MinLength<8> &
        tags.Pattern<"^(?=.*[A-Za-z])(?=.*\\d).{8,}$"> &
        tags.Format<"password">
    >("Passw0rd" + RandomGenerator.alphaNumeric(6)),
    href: typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(
      "https://app.example.com/join",
    ),
    referrer: "", // allowed by DTO (empty string variant)
  } satisfies ITodoUser.IJoin;
  const userA: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinABody },
  );
  typia.assert(userA);

  // 2) Create a todo as User A
  const createBody = {
    title: typia.assert<
      string &
        tags.MinLength<1> &
        tags.MaxLength<120> &
        tags.Pattern<"^[^\\r\\n]*$">
    >(RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 8 })),
    // optional description omitted
    due_date: typia.assert<string & tags.Format<"date">>(
      new Date().toISOString().slice(0, 10),
    ),
  } satisfies ITodoTodo.ICreate;
  const todoA: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    { body: createBody },
  );
  typia.assert(todoA);

  // 3) Join as User B (switches Authorization to B)
  const joinBBody = {
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: typia.assert<
      string &
        tags.MinLength<8> &
        tags.Pattern<"^(?=.*[A-Za-z])(?=.*\\d).{8,}$"> &
        tags.Format<"password">
    >("Passw0rd" + RandomGenerator.alphaNumeric(6)),
    href: typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(
      "https://app.example.com/join",
    ),
    referrer: "",
  } satisfies ITodoUser.IJoin;
  const userB: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBBody },
  );
  typia.assert(userB);

  // 4) Attempt cross-user update as B and expect denial
  const updateBody = {
    title: typia.assert<
      string &
        tags.MinLength<1> &
        tags.MaxLength<120> &
        tags.Pattern<"^[^\\r\\n]*$">
    >(RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 })),
  } satisfies ITodoTodo.IUpdate;
  await TestValidator.error(
    "cross-user cannot update another user's todo",
    async () => {
      await api.functional.todo.user.todos.update(connection, {
        todoId: todoA.id,
        body: updateBody,
      });
    },
  );
}
