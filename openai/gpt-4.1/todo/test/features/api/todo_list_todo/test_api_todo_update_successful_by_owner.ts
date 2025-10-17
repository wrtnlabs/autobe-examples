import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that an authenticated user can update their own Todo item (title,
 * description, and completion status).
 *
 * Workflow:
 *
 * 1. Register and authenticate a new user
 * 2. Create a Todo item as the authenticated user
 * 3. Update the Todo's title, description, and completed status
 * 4. Validate that updates persisted, updated_at timestamp has changed, and that
 *    completed/completed_at are consistent
 */
export async function test_api_todo_update_successful_by_owner(
  connection: api.IConnection,
) {
  // 1. Register user
  const userBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListUser.IJoin;
  const auth: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userBody },
  );
  typia.assert(auth);

  // 2. Create Todo
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ITodoListTodo.ICreate;
  const created: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 3. Update Todo
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    completed: !created.completed,
  } satisfies ITodoListTodo.IUpdate;
  const updated: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: created.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Assertions
  TestValidator.equals("updated id matches original", updated.id, created.id);
  TestValidator.equals(
    "owner remains the same",
    updated.todo_list_user_id,
    auth.id,
  );
  TestValidator.equals("title updated", updated.title, updateBody.title);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "completed status updated",
    updated.completed,
    updateBody.completed,
  );
  TestValidator.notEquals(
    "updated_at timestamp advanced",
    updated.updated_at,
    created.updated_at,
  );
  if (updated.completed)
    TestValidator.predicate(
      "completed_at set when completed",
      updated.completed_at !== null && updated.completed_at !== undefined,
    );
  else
    TestValidator.equals(
      "completed_at cleared when uncompleted",
      updated.completed_at,
      null,
    );
}
