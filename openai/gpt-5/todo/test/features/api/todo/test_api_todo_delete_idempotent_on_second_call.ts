import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";

export async function test_api_todo_delete_idempotent_on_second_call(
  connection: api.IConnection,
) {
  /**
   * Idempotent deletion behavior for Todo.
   *
   * Steps:
   *
   * 1. Register a new todoMember (join) to obtain authenticated context
   * 2. Create a Todo and validate basic invariants
   * 3. First delete succeeds
   * 4. Second delete on the same id should result in a neutral not-available error
   *
   * Notes:
   *
   * - Do not assert HTTP status codes; only assert that an error occurs on the
   *   second delete attempt.
   * - Do not touch connection.headers; the SDK manages auth tokens.
   */

  // 1) Authenticate (join) as a new todoMember
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListTodoMemberJoin.ICreate;
  const authorized = await api.functional.auth.todoMember.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Create a Todo (single-line title; 1-100 chars after trimming)
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITodoListTodo.ICreate;
  const todo = await api.functional.todoList.todos.create(connection, {
    body: createBody,
  });
  typia.assert(todo);

  // Basic business invariants on creation
  TestValidator.predicate(
    "created todo defaults to isCompleted=false",
    todo.isCompleted === false,
  );
  const createdAtMs = new Date(todo.createdAt).getTime();
  const updatedAtMs = new Date(todo.updatedAt).getTime();
  TestValidator.predicate(
    "updatedAt is same or after createdAt",
    updatedAtMs >= createdAtMs,
  );

  // 3) First delete should succeed
  await api.functional.todoList.todoMember.todos.erase(connection, {
    todoId: todo.id,
  });

  // 4) Second delete should result in a neutral not-available outcome
  await TestValidator.error(
    "second delete attempt must fail neutrally",
    async () => {
      await api.functional.todoList.todoMember.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );
}
