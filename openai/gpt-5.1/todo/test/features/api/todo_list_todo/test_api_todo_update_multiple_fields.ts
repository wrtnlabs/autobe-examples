import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates updating all editable fields of a todo item at once for the
 * authenticated user.
 *
 * 1. Register a new user for authentication context.
 * 2. Create a todo item owned by that user.
 * 3. Update all editable fields for that todo (title, description, completed,
 *    due_date), including setting description and due_date to null.
 * 4. Check updated fields, null removals, and updated_at timestamp increased.
 * 5. Attempt forbidden update as different user.
 */
export async function test_api_todo_update_multiple_fields(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const registerBody = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test.domain/register",
    referrer: "https://test.domain/landing",
  } satisfies ITodoListUser.IJoin;
  const authUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: registerBody });
  typia.assert(authUser);

  // 2. Create a todo for the new user
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 15 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date(Date.now() + 864e5).toISOString(),
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: createBody },
  );
  typia.assert(todo);

  // 3. Update all editable fields (title, description, completed, due_date), remove optional properties by setting null
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 20 }),
    description: null,
    completed: true,
    due_date: null,
  } satisfies ITodoListTodo.IUpdate;
  const updated: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Confirm all changes; ensure nulls are reflected and updated_at is increased
  TestValidator.equals("updated todo id", updated.id, todo.id);
  TestValidator.equals(
    "updated title matches",
    updated.title,
    updateBody.title,
  );
  TestValidator.equals("description removed", updated.description, null);
  TestValidator.equals("completed field set", updated.completed, true);
  TestValidator.equals("due_date removed", updated.due_date, null);
  TestValidator.predicate(
    "updated_at advanced",
    new Date(updated.updated_at).getTime() >
      new Date(todo.updated_at).getTime(),
  );

  // 5. Register a second user to verify unauthorized update is forbidden
  const regBody2 = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test.domain/register",
    referrer: "https://test.domain/landing",
  } satisfies ITodoListUser.IJoin;
  const otherUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: regBody2 });
  typia.assert(otherUser);

  // Try to update as a different authenticated user (should fail)
  await TestValidator.error("other user cannot update todo", async () => {
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoListTodo.IUpdate,
    });
  });
}
