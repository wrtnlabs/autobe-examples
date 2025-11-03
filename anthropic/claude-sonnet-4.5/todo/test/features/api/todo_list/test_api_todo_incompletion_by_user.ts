import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the workflow of marking a completed todo item as incomplete.
 *
 * This test validates the complete workflow of reverting a completed todo item
 * back to incomplete status. The test creates a fresh user context, establishes
 * a todo item, marks it complete, then marks it incomplete again to verify the
 * status management flexibility.
 *
 * Test workflow:
 *
 * 1. Register a new user account
 * 2. Create a todo item for the authenticated user
 * 3. Mark the todo item as complete
 * 4. Mark the completed todo item as incomplete
 * 5. Verify the status changed to 'incomplete'
 * 6. Verify the updated_at timestamp was refreshed
 */
export async function test_api_todo_incompletion_by_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account to establish authentication context
  const registerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.IRegister;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registerData,
    });
  typia.assert(authorizedUser);

  // Step 2: Create a todo item for the authenticated user
  const todoCreateData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "incomplete",
  } satisfies ITodoListTodo.ICreate;

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: todoCreateData,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "todo title matches",
    createdTodo.title,
    todoCreateData.title,
  );
  TestValidator.equals(
    "todo status is incomplete",
    createdTodo.status,
    "incomplete",
  );

  // Step 3: Mark the todo item as complete
  const completedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(completedTodo);

  TestValidator.equals(
    "todo status changed to complete",
    completedTodo.status,
    "complete",
  );
  TestValidator.equals(
    "todo ID remains the same",
    completedTodo.id,
    createdTodo.id,
  );

  // Store the completed todo's updated_at timestamp for comparison
  const completedTimestamp = completedTodo.updated_at;

  // Step 4: Mark the completed todo item as incomplete (main operation being tested)
  const incompleteTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.incomplete(connection, {
      todoId: completedTodo.id,
    });
  typia.assert(incompleteTodo);

  // Step 5: Verify the status changed back to incomplete
  TestValidator.equals(
    "todo status reverted to incomplete",
    incompleteTodo.status,
    "incomplete",
  );

  // Step 6: Verify the updated_at timestamp was refreshed
  TestValidator.equals(
    "todo ID remains the same",
    incompleteTodo.id,
    createdTodo.id,
  );
  TestValidator.notEquals(
    "updated_at timestamp was refreshed",
    incompleteTodo.updated_at,
    completedTimestamp,
  );

  // Verify other properties remain unchanged
  TestValidator.equals(
    "title unchanged",
    incompleteTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "description unchanged",
    incompleteTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "user ID unchanged",
    incompleteTodo.todo_list_user_id,
    createdTodo.todo_list_user_id,
  );
}
