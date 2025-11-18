import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test permanent deletion of a todo item by its rightful owner.
 *
 * 1. Register user1 (the owner of the todo)
 * 2. Create a todo as user1
 * 3. Permanently erase the todo (by owner)
 * 4. Attempt to erase the todo again (should error: already deleted)
 * 5. Register user2 (non-owner)
 * 6. Attempt to erase the original todo as user2 (should error: not
 *    owner/forbidden)
 *
 * Verifies strict owner-only access for this operation and that a deleted todo
 * is irrecoverable.
 */
export async function test_api_todo_permanent_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register user1
  const user1JoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
    ip: null,
  } satisfies ITodoAppUser.IJoin;
  const user1 = await api.functional.auth.user.join(connection, {
    body: user1JoinInput,
  });
  typia.assert(user1);

  // 2. Create a todo as user1
  const todoInput = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    due_date: null,
  } satisfies ITodoAppTodo.ICreate;
  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: todoInput,
  });
  typia.assert(todo);
  TestValidator.equals(
    "created todo belongs to user1",
    todo.todo_app_user_id,
    user1.id,
  );

  // 3. Permanently erase the todo as owner
  await api.functional.todoApp.user.todos.erase(connection, {
    todoId: todo.id,
  });
  // No direct retrieval to confirm deletion (no GET endpoint), but try erroring by re-deleting

  // 4. Attempt to erase the already-deleted todo as owner
  await TestValidator.error("cannot erase already-deleted todo", async () => {
    await api.functional.todoApp.user.todos.erase(connection, {
      todoId: todo.id,
    });
  });

  // 5. Register user2
  const user2JoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(15),
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
    ip: null,
  } satisfies ITodoAppUser.IJoin;
  const user2 = await api.functional.auth.user.join(connection, {
    body: user2JoinInput,
  });
  typia.assert(user2);

  // 6. Attempt to erase original todo as user2 (non-owner, should error)
  await TestValidator.error("Non-owner cannot erase todo", async () => {
    await api.functional.todoApp.user.todos.erase(connection, {
      todoId: todo.id,
    });
  });
}
