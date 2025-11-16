import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creating a todo item with completed set to true from creation.
 *
 * This test validates that users can add already-completed tasks to their todo
 * list for tracking purposes. This is useful for logging historical or
 * already-finished work to maintain a complete task history.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new user account
 * 2. Create a todo item with completed flag set to true
 * 3. Verify the todo was created successfully with completed status
 */
export async function test_api_todo_creation_completed_from_start(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";
  const currentPageUrl = typia.random<string & tags.Format<"uri">>();
  const referrerUrl = typia.random<string & tags.Format<"uri">>();

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: currentPageUrl,
        referrer: referrerUrl,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a todo item that is already completed
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const completedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        completed: true,
        status: "completed",
        priority: "medium",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(completedTodo);

  // Step 3: Verify the todo was created with completed status
  TestValidator.equals(
    "todo should be marked as completed",
    completedTodo.completed,
    true,
  );
  TestValidator.equals(
    "todo status should be completed",
    completedTodo.status,
    "completed",
  );
  TestValidator.equals(
    "todo title should match",
    completedTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "todo description should match",
    completedTodo.description,
    todoDescription,
  );
}
