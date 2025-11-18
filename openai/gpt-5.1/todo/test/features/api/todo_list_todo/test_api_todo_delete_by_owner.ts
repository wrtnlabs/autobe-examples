import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate deletion of a todo item by its owner.
 *
 * This test ensures that after registering a user and creating a todo item, the
 * user can successfully delete the todo by its ID. It confirms that deleted
 * todos are fully removed, cannot be deleted again, and all actions respect
 * authentication context and data integrity. Error case: attempting to delete
 * the same todo twice should fail with not-found behavior. Ownership is
 * strictly enforced. Steps:
 *
 * 1. Register a user
 * 2. Create a todo item as the user
 * 3. Delete the todo by ID (expect success)
 * 4. Attempt to delete the same todo again (expect error)
 */
export async function test_api_todo_delete_by_owner(
  connection: api.IConnection,
) {
  // 1. Register the user
  const userJoinBody = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test.todo/e2e/join",
    referrer: "https://test.todo/e2e/source",
  } satisfies ITodoListUser.IJoin;
  const userAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinBody });
  typia.assert(userAuth);

  // 2. Create a todo item as this user
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 10,
    }),
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: todoCreateBody },
  );
  typia.assert(todo);
  TestValidator.equals(
    "todo is owned by user",
    todo.todo_list_user_id,
    userAuth.id,
  );
  TestValidator.equals(
    "todo title matches input",
    todo.title,
    todoCreateBody.title,
  );
  if (
    todoCreateBody.description !== null &&
    todoCreateBody.description !== undefined
  ) {
    TestValidator.equals(
      "todo description matches input",
      todo.description,
      todoCreateBody.description,
    );
  }
  if (
    todoCreateBody.due_date !== null &&
    todoCreateBody.due_date !== undefined
  ) {
    TestValidator.equals(
      "todo due date matches input",
      todo.due_date,
      todoCreateBody.due_date,
    );
  }

  // 3. Delete the todo by its ID (success case)
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: todo.id,
  });

  // 4. Attempt to delete the same todo again (error case: not found)
  await TestValidator.error(
    "repeated deletion of already-removed todo should fail",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );
}
