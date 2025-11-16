import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieving a todo item with a due_date to validate deadline tracking
 * functionality.
 *
 * This test ensures that date-time fields are correctly handled in ISO 8601
 * format and that todos with deadlines can be properly retrieved for
 * deadline-based features like sorting and overdue notifications.
 *
 * Test steps:
 *
 * 1. Register a new user for authentication
 * 2. Create a todo item with a specific due_date in ISO 8601 format
 * 3. Retrieve the todo item by its ID
 * 4. Validate the retrieved todo matches the created todo
 * 5. Verify the due_date field matches the original value
 */
export async function test_api_todo_retrieval_with_due_date(
  connection: api.IConnection,
) {
  // Step 1: Register a new user for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

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

  // Step 2: Create a todo item with a specific due_date
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        status: "pending",
        priority: "high",
        due_date: dueDate,
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Retrieve the todo item by its ID
  const retrievedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);

  // Step 4: Validate the retrieved todo matches the created todo
  TestValidator.equals(
    "retrieved todo ID matches created todo ID",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "retrieved todo title matches",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "retrieved todo description matches",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "retrieved todo status matches",
    retrievedTodo.status,
    createdTodo.status,
  );
  TestValidator.equals(
    "retrieved todo priority matches",
    retrievedTodo.priority,
    createdTodo.priority,
  );
  TestValidator.equals(
    "retrieved todo completed flag matches",
    retrievedTodo.completed,
    createdTodo.completed,
  );

  // Step 5: Verify the due_date field matches the original value
  TestValidator.equals(
    "retrieved todo due_date matches created due_date",
    retrievedTodo.due_date,
    dueDate,
  );
}
