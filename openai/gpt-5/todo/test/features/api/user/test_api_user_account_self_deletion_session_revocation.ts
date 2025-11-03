import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate self-deletion and session revocation on the todo user domain.
 *
 * Workflow
 *
 * 1. Register a new user (join) to obtain user id and an authenticated session
 *    (token is set automatically).
 * 2. Create a todo as the authenticated user and validate ownership mapping.
 * 3. Self-delete the account using the authenticated session.
 * 4. Attempt any protected call (create todo again) with the old session; expect
 *    an error due to session revocation.
 *
 * Notes
 *
 * - Do not touch connection.headers; SDK manages Authorization automatically.
 * - Use TestValidator.error for post-deletion failure without checking specific
 *   HTTP status codes.
 */
export async function test_api_user_account_self_deletion_session_revocation(
  connection: api.IConnection,
) {
  // 1) Register a new user to obtain user id and session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string &
        tags.MinLength<8> &
        tags.Pattern<"^(?=.*[A-Za-z])(?=.*\\d).{8,}$"> &
        tags.Format<"password">
    >(),
    href: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
    referrer: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<80000> & tags.Format<"uri">
    >(),
  } satisfies ITodoUser.IJoin;

  const authorized: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(authorized);

  // 2) Create a todo using the authenticated session
  const todoCreate1 = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 12,
      wordMin: 3,
      wordMax: 10,
    }),
    due_date: typia.random<string & tags.Format<"date">>(),
  } satisfies ITodoTodo.ICreate;

  const todo1: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    { body: todoCreate1 },
  );
  typia.assert(todo1);

  // Ownership validation: created todo must belong to the creator
  TestValidator.equals(
    "todo owner is the creator",
    todo1.user.id,
    authorized.id,
  );

  // 3) Self-delete the account
  await api.functional.todo.user.users.erase(connection, {
    userId: authorized.id,
  });

  // 4) Attempt to create another todo with the revoked session; must fail
  const todoCreate2 = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    due_date: typia.random<string & tags.Format<"date">>(),
  } satisfies ITodoTodo.ICreate;

  await TestValidator.error(
    "creating todo after self-deletion must fail due to session revocation",
    async () => {
      await api.functional.todo.user.todos.create(connection, {
        body: todoCreate2,
      });
    },
  );
}
