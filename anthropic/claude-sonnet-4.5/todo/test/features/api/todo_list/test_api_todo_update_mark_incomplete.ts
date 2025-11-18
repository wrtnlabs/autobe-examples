import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test unmarking a completed todo back to incomplete status.
 *
 * This test validates the bidirectional nature of todo completion status by
 * creating a user, creating a todo, marking it as completed, then marking it
 * back to incomplete. The test verifies that the completed field becomes false,
 * the completed_at timestamp is cleared (set to null), and the updated_at
 * timestamp reflects the change.
 *
 * This ensures users can toggle completion status in both directions and that
 * the system properly manages the completed_at field lifecycle.
 *
 * Test Flow:
 *
 * 1. Create a user account and authenticate
 * 2. Create a new todo (starts in incomplete state)
 * 3. Mark the todo as completed (completed=true)
 * 4. Mark the todo back to incomplete (completed=false) - PRIMARY TEST
 * 5. Verify completed=false, completed_at=null, and updated_at is updated
 */
export async function test_api_todo_update_mark_incomplete(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: testHref,
      referrer: testReferrer,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert<ITodoListUser.IAuthorized>(user);

  // Step 2: Create a new todo item in incomplete state
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert<ITodoListTodo>(createdTodo);

  // Verify initial incomplete state
  TestValidator.equals(
    "todo initially incomplete",
    createdTodo.completed,
    false,
  );
  TestValidator.equals(
    "completed_at initially null",
    createdTodo.completed_at,
    null,
  );

  // Step 3: First update - mark the todo as completed
  const completedTodo = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: createdTodo.id,
      body: {
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert<ITodoListTodo>(completedTodo);

  // Verify completed state
  TestValidator.equals(
    "todo marked as completed",
    completedTodo.completed,
    true,
  );
  TestValidator.predicate(
    "completed_at set when completed",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  // Step 4: Second update - mark the todo back to incomplete (PRIMARY TEST)
  const incompleteTodo = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: completedTodo.id,
      body: {
        completed: false,
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert<ITodoListTodo>(incompleteTodo);

  // Step 5: Final validation - verify incomplete state
  TestValidator.equals(
    "todo marked back to incomplete",
    incompleteTodo.completed,
    false,
  );
  TestValidator.equals(
    "completed_at cleared when unmarked",
    incompleteTodo.completed_at,
    null,
  );
  TestValidator.predicate(
    "updated_at timestamp changed",
    new Date(incompleteTodo.updated_at).getTime() >
      new Date(completedTodo.updated_at).getTime(),
  );
  TestValidator.equals(
    "todo ID unchanged throughout updates",
    incompleteTodo.id,
    createdTodo.id,
  );
  TestValidator.equals("todo title unchanged", incompleteTodo.title, todoTitle);
}
