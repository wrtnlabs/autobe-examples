import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieving a todo item with all optional fields populated.
 *
 * This test validates that the API correctly returns a fully-populated todo
 * item when all optional fields (description, status, priority, due_date,
 * completed) are specified during creation. It ensures comprehensive data
 * retrieval for feature-rich todos and verifies that all enum values and
 * date-time fields conform to their expected formats.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new user account
 * 2. Create a todo with all optional fields populated (description,
 *    status='in_progress', priority='high', due_date, completed=false)
 * 3. Retrieve the todo by its ID
 * 4. Validate all fields are returned correctly with proper types and formats
 */
export async function test_api_todo_retrieval_with_complete_fields(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "securePassword123";

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a todo with ALL optional fields populated
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const todoDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        status: "in_progress",
        priority: "high",
        due_date: todoDueDate,
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Retrieve the todo by its ID
  const retrievedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);

  // Step 4: Validate all fields are returned correctly
  TestValidator.equals("todo ID matches", retrievedTodo.id, createdTodo.id);
  TestValidator.equals("todo title matches", retrievedTodo.title, todoTitle);
  TestValidator.equals(
    "todo description matches",
    retrievedTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "todo status is in_progress",
    retrievedTodo.status,
    "in_progress",
  );
  TestValidator.equals("todo priority is high", retrievedTodo.priority, "high");
  TestValidator.equals(
    "todo due_date matches",
    retrievedTodo.due_date,
    todoDueDate,
  );
  TestValidator.equals(
    "todo completed is false",
    retrievedTodo.completed,
    false,
  );
  TestValidator.equals(
    "completed_at should be null",
    retrievedTodo.completed_at,
    null,
  );
}
