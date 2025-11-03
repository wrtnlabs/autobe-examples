import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Ensure deleted todo details are not retrievable.
 *
 * Business flow:
 *
 * 1. User self-joins to obtain an authenticated session
 * 2. User creates a personal todo
 * 3. User reads the todo once to confirm existence and ownership
 * 4. User permanently deletes the todo (MVP hard deletion semantics)
 * 5. Subsequent GET by the owner must fail (resource not available)
 *
 * Notes:
 *
 * - SDK manages Authorization automatically after join; never touch headers
 * - Validate only business behavior using TestValidator.error (no status checks)
 * - Use correct DTO variants: ITodoUser.IJoin, ITodoTodo.ICreate, ITodoTodo
 */
export async function test_api_todo_detail_not_available_after_deletion(
  connection: api.IConnection,
) {
  // 1) Join as a new user (establish authenticated session)
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

  // 2) Create a todo for the authenticated user
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    due_date: typia.random<string & tags.Format<"date">>(),
  } satisfies ITodoTodo.ICreate;
  const created: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    { body: createBody },
  );
  typia.assert(created);

  // 3) Read once before deletion to confirm existence and ownership
  const fetched: ITodoTodo = await api.functional.todo.user.todos.at(
    connection,
    { todoId: created.id },
  );
  typia.assert(fetched);
  TestValidator.equals(
    "created and fetched todo id should match",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "todo owner must be the authenticated user",
    fetched.user.id,
    authorized.id,
  );

  // 4) Permanently delete the todo (void response)
  await api.functional.todo.user.todos.erase(connection, {
    todoId: created.id,
  });

  // 5) Subsequent GET must fail (resource unavailable after deletion)
  await TestValidator.error("deleted todo cannot be retrieved", async () => {
    await api.functional.todo.user.todos.at(connection, { todoId: created.id });
  });
}
