import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test deleting a completed todo item.
 *
 * This test validates the complete workflow of creating a todo, marking it as
 * completed, and then deleting it. The test ensures that:
 *
 * 1. User authentication is properly established
 * 2. Todo item can be created successfully
 * 3. Todo can be marked as completed (completed_at timestamp is set)
 * 4. Completed todo can be deleted via soft-delete mechanism
 * 5. Deleted todo response includes both completed_at and deleted_at timestamps
 * 6. Completion history is preserved in the soft-deleted record
 *
 * The test verifies that the soft-delete operation maintains data integrity and
 * preserves the completion status of the todo item for audit purposes.
 */
export async function test_api_todo_delete_completed_todo(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a new todo item
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  TestValidator.equals(
    "created todo title matches",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "created todo is not completed initially",
    createdTodo.completed,
    false,
  );
  TestValidator.equals(
    "created todo has no completed_at initially",
    createdTodo.completed_at,
    null,
  );

  // Step 3: Mark the todo as completed
  const updatedTodo = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: createdTodo.id,
      body: {
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);

  TestValidator.equals(
    "updated todo is marked as completed",
    updatedTodo.completed,
    true,
  );
  TestValidator.predicate(
    "completed_at timestamp is set",
    updatedTodo.completed_at !== null && updatedTodo.completed_at !== undefined,
  );

  // Step 4: Delete the completed todo
  const deletedTodo = await api.functional.todoList.user.todos.erase(
    connection,
    {
      todoId: updatedTodo.id,
    },
  );
  typia.assert(deletedTodo);

  // Step 5: Validate the deleted todo response
  TestValidator.equals(
    "deleted todo id matches",
    deletedTodo.id,
    updatedTodo.id,
  );
  TestValidator.equals(
    "deleted todo title is preserved",
    deletedTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "deleted todo completion status is preserved",
    deletedTodo.completed,
    true,
  );

  // Step 6: Verify both completed_at and deleted_at timestamps exist
  TestValidator.predicate(
    "completed_at timestamp is preserved after deletion",
    deletedTodo.completed_at !== null && deletedTodo.completed_at !== undefined,
  );

  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedTodo.deleted_at !== null && deletedTodo.deleted_at !== undefined,
  );

  // Verify completion timestamp matches the one from update
  TestValidator.equals(
    "completed_at timestamp remains unchanged after deletion",
    deletedTodo.completed_at,
    updatedTodo.completed_at,
  );
}
