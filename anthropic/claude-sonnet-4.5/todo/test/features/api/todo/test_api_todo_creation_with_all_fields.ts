import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creating a todo item with all possible fields populated.
 *
 * This test validates that the API correctly handles comprehensive todo
 * creation with all fields specified including title, description, status,
 * priority, due_date, and completed flag. It ensures proper handling of enum
 * values for status and priority, date-time format for due_date, and boolean
 * for completed.
 *
 * Process:
 *
 * 1. Create and authenticate a user account
 * 2. Create a todo with all fields populated
 * 3. Validate that all provided values are correctly persisted
 * 4. Verify completed_at field behavior
 */
export async function test_api_todo_creation_with_all_fields(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a todo with all fields populated
  const statuses = [
    "pending",
    "in_progress",
    "completed",
    "cancelled",
  ] as const;
  const priorities = ["low", "medium", "high"] as const;

  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const todoStatus = RandomGenerator.pick(statuses);
  const todoPriority = RandomGenerator.pick(priorities);
  const todoDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const todoCompleted = false;

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        status: todoStatus,
        priority: todoPriority,
        due_date: todoDueDate,
        completed: todoCompleted,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Validate all provided values are correctly persisted
  TestValidator.equals("todo title matches", createdTodo.title, todoTitle);
  TestValidator.equals(
    "todo description matches",
    createdTodo.description,
    todoDescription,
  );
  TestValidator.equals("todo status matches", createdTodo.status, todoStatus);
  TestValidator.equals(
    "todo priority matches",
    createdTodo.priority,
    todoPriority,
  );
  TestValidator.equals(
    "todo due_date matches",
    createdTodo.due_date,
    todoDueDate,
  );
  TestValidator.equals(
    "todo completed matches",
    createdTodo.completed,
    todoCompleted,
  );

  // Step 4: Verify completed_at is null when completed is false
  TestValidator.equals(
    "completed_at is null when not completed",
    createdTodo.completed_at,
    null,
  );
}
