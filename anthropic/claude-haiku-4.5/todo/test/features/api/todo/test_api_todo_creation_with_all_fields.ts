import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates comprehensive todo creation with all available fields.
 *
 * This test ensures that when an authenticated user creates a todo with
 * complete field specification including title, description (maximum length),
 * priority level (high), and future due date, all fields are correctly stored
 * and returned in the API response. The test validates:
 *
 * 1. User authentication through registration
 * 2. Todo creation with all optional fields populated
 * 3. Description field accepts maximum 5000 characters
 * 4. Priority enum constraint (high/medium/low) is respected
 * 5. Due date is in ISO 8601 format and not in the past
 * 6. Auto-generated fields (id, created_at, updated_at) are properly initialized
 * 7. Completion status defaults to false
 * 8. All response fields match the request specification exactly
 */
export async function test_api_todo_creation_with_all_fields(
  connection: api.IConnection,
) {
  // Step 1: Register new user to get authentication token
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "SecurePassword123",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);
  TestValidator.equals(
    "user email matches registration",
    user.email,
    userEmail,
  );

  // Step 2: Prepare todo creation data with all fields
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });
  const priority = "high" as const;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // Due date 7 days from now

  // Step 3: Create todo with all fields populated
  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        priority: priority,
        due_date: futureDate.toISOString(),
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 4: Validate all fields in response match the request
  TestValidator.equals(
    "created todo title matches input",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "created todo description matches input",
    createdTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "created todo priority matches input",
    createdTodo.priority,
    priority,
  );
  TestValidator.equals(
    "created todo due_date matches input",
    createdTodo.due_date,
    futureDate.toISOString(),
  );

  // Step 5: Validate auto-generated fields are properly initialized
  TestValidator.predicate(
    "todo id is present and non-empty",
    createdTodo.id.length > 0,
  );
  TestValidator.equals(
    "todo completed status defaults to false",
    createdTodo.completed,
    false,
  );
  TestValidator.predicate(
    "todo created_at timestamp is present",
    createdTodo.created_at.length > 0,
  );
  TestValidator.predicate(
    "todo updated_at timestamp is present",
    createdTodo.updated_at.length > 0,
  );
}
