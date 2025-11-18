import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate updating a todo to mark it as completed.
 *
 * Steps:
 *
 * 1. Register and authenticate a new user.
 * 2. Create a new todo (should default to is_completed: false).
 * 3. Update the new todo to set is_completed: true with a valid completed_at
 *    timestamp.
 * 4. Verify that is_completed is true and completed_at is a valid ISO 8601
 *    timestamp in the response.
 * 5. Ensure completed_at is present ONLY when is_completed is true.
 */
export async function test_api_todo_update_mark_as_completed(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const userCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test.example.com/todos",
    referrer: "https://test.example.com/",
    ip: null,
  } satisfies ITodoUser.ICreate;
  const authUser: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userCreate },
  );
  typia.assert(authUser);
  // 2. Create a new todo (should be incomplete by default)
  const todoCreate = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // due tomorrow
    priority: RandomGenerator.pick(["low", "medium", "high"] as const),
  } satisfies ITodoTodo.ICreate;
  const created: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    { body: todoCreate },
  );
  typia.assert(created);
  TestValidator.equals(
    "new todo is not completed by default",
    created.is_completed,
    false,
  );
  TestValidator.equals(
    "completed_at is null by default",
    created.completed_at,
    null,
  );
  // 3. Update the todo to mark as completed
  const completedAt = new Date().toISOString();
  const updateReq = {
    is_completed: true,
    completed_at: completedAt,
  } satisfies ITodoTodo.IUpdate;
  const updated: ITodoTodo = await api.functional.todo.user.todos.update(
    connection,
    { todoId: created.id, body: updateReq },
  );
  typia.assert(updated);
  // 4. Check updated fields
  TestValidator.equals("todo marked as completed", updated.is_completed, true);
  TestValidator.equals(
    "completed_at is set when completed",
    updated.completed_at,
    completedAt,
  );
  // 5. Check completed_at is not populated if is_completed is false (revert to incomplete)
  const updateBack = {
    is_completed: false,
    completed_at: null,
  } satisfies ITodoTodo.IUpdate;
  const reverted: ITodoTodo = await api.functional.todo.user.todos.update(
    connection,
    { todoId: created.id, body: updateBack },
  );
  typia.assert(reverted);
  TestValidator.equals("todo uncompleted", reverted.is_completed, false);
  TestValidator.equals(
    "completed_at should be null if not completed",
    reverted.completed_at,
    null,
  );
}
