import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test unmarking a completed todo back to incomplete status.
 *
 * This test validates that when a todo marked as complete is updated to
 * incomplete, the system correctly clears the completion tracking information
 * while maintaining all other todo properties and updating the modification
 * timestamp.
 *
 * Workflow:
 *
 * 1. Create user account via authentication
 * 2. Create an initial todo item (incomplete)
 * 3. Update todo to mark as completed (sets completed_at)
 * 4. Update todo back to incomplete (clears completed_at to null)
 * 5. Verify completion status, timestamps, and field integrity
 */
export async function test_api_todo_update_completion_status_true_to_false(
  connection: api.IConnection,
) {
  // 1. Create user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);
  const registeredUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(registeredUser);

  // 2. Create initial todo item (incomplete)
  const todoTitle = RandomGenerator.paragraph({ sentences: 1 });
  const todoDescription = RandomGenerator.paragraph({ sentences: 2 });
  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Verify initial todo state
  TestValidator.equals(
    "todo initially incomplete",
    createdTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "todo initial completed_at is null",
    createdTodo.completed_at,
    null,
  );

  // 3. Update todo to mark as completed
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        is_completed: true,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(completedTodo);

  // Verify completed state
  TestValidator.equals(
    "todo marked as completed",
    completedTodo.is_completed,
    true,
  );
  TestValidator.predicate(
    "completed_at is set when marked complete",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );
  TestValidator.equals(
    "title unchanged after completion",
    completedTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "user unchanged after completion",
    completedTodo.todo_app_user_id,
    createdTodo.todo_app_user_id,
  );

  // Store the completed_at value for comparison
  const completedAtWhenFinished = completedTodo.completed_at;
  const updatedAtAfterCompletion = completedTodo.updated_at;

  // 4. Update todo back to incomplete status
  const incompleteTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        is_completed: false,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(incompleteTodo);

  // 5. Verify completion status cleared
  TestValidator.equals(
    "todo marked as incomplete",
    incompleteTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "completed_at cleared to null",
    incompleteTodo.completed_at,
    null,
  );

  // Verify field integrity
  TestValidator.equals(
    "title unchanged after incompletion",
    incompleteTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "description unchanged",
    incompleteTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "user remains same",
    incompleteTodo.todo_app_user_id,
    createdTodo.todo_app_user_id,
  );
  TestValidator.equals(
    "created_at unchanged",
    incompleteTodo.created_at,
    createdTodo.created_at,
  );

  // Verify updated_at was modified
  TestValidator.predicate(
    "updated_at changed after marking incomplete",
    incompleteTodo.updated_at !== updatedAtAfterCompletion,
  );
  TestValidator.predicate(
    "updated_at is more recent",
    new Date(incompleteTodo.updated_at) >= new Date(updatedAtAfterCompletion),
  );

  // Verify todo ID consistency throughout lifecycle
  TestValidator.equals("todo ID consistent", incompleteTodo.id, createdTodo.id);
}
