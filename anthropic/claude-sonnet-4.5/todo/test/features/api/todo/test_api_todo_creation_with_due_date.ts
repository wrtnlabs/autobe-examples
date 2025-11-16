import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creating a todo item with a due_date specified to validate deadline
 * tracking from creation.
 *
 * This test ensures the API correctly handles ISO 8601 date-time format for due
 * dates and that deadline-based features can be used immediately upon todo
 * creation. The test verifies the due_date is correctly stored and returned,
 * enabling deadline-based sorting, filtering, and overdue notification
 * features.
 *
 * **Step-by-step process:**
 *
 * 1. Create and authenticate a test user account via POST /auth/user/join
 * 2. Create a todo item with a due_date field set to a future ISO 8601 date-time
 * 3. Validate that the created todo has the due_date field matching the input
 *    value
 * 4. Verify the response contains all expected fields including the due_date
 * 5. Confirm the due_date is properly formatted as ISO 8601 date-time string
 */
export async function test_api_todo_creation_with_due_date(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a test user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";
  const currentUrl = typia.random<string & tags.Format<"uri">>();

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: currentUrl,
        referrer: currentUrl,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a todo item with a due_date field set to a future ISO 8601 date-time
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // Set due date to 7 days from now
  const dueDateString = futureDate.toISOString();

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

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        status: "pending",
        priority: "medium",
        due_date: dueDateString,
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Validate that the created todo has the due_date field matching the input value
  TestValidator.equals(
    "due_date should match the input value",
    createdTodo.due_date,
    dueDateString,
  );

  // Step 4: Verify the response contains all expected fields
  TestValidator.equals(
    "title should match input",
    createdTodo.title,
    todoTitle,
  );

  TestValidator.equals(
    "description should match input",
    createdTodo.description,
    todoDescription,
  );

  TestValidator.equals(
    "status should be pending",
    createdTodo.status,
    "pending",
  );

  TestValidator.equals(
    "priority should be medium",
    createdTodo.priority,
    "medium",
  );

  TestValidator.equals(
    "completed should be false",
    createdTodo.completed,
    false,
  );
}
