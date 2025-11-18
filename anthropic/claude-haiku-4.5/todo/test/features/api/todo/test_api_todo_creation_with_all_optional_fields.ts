import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creating a todo with all available fields including title, description,
 * priority, and due_date. The authenticated user creates a todo with
 * comprehensive field data and verifies all fields are correctly stored and
 * returned.
 *
 * This test validates:
 *
 * 1. User registration and authentication
 * 2. Todo creation with all optional fields populated
 * 3. All provided fields are correctly stored and returned
 * 4. Auto-generated fields are present in response
 *
 * Business flow:
 *
 * 1. Register a new user account
 * 2. Create a todo with all optional fields (title, description, priority,
 *    due_date)
 * 3. Validate all fields match the input data and response structure is complete
 */
export async function test_api_todo_creation_with_all_optional_fields(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: email,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a todo with all optional fields
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 3,
    wordMax: 8,
  });

  const todoData = {
    title: todoTitle,
    description: todoDescription,
    priority: "high" as const,
    due_date: futureDate.toISOString(),
  } satisfies ITodoListTodo.ICreate;

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: todoData,
    });
  typia.assert(createdTodo);

  // Step 3: Validate all fields are correctly stored and returned
  TestValidator.equals(
    "todo title matches created value",
    createdTodo.title,
    todoTitle,
  );

  TestValidator.equals(
    "todo description matches created value",
    createdTodo.description,
    todoDescription,
  );

  TestValidator.equals(
    "todo priority is set to high",
    createdTodo.priority,
    "high",
  );

  TestValidator.equals(
    "todo due_date matches created value",
    createdTodo.due_date,
    futureDate.toISOString(),
  );

  // Step 4: Validate default values for auto-managed fields
  TestValidator.equals(
    "todo completion status defaults to false",
    createdTodo.completed,
    false,
  );

  TestValidator.equals(
    "todo completed_at is null for new uncompleted todo",
    createdTodo.completed_at,
    null,
  );
}
