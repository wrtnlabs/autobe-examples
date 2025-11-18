import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that retrieval returns all field types correctly formatted for a todo
 * item.
 *
 * This test validates comprehensive field type correctness by:
 *
 * 1. Creating a user account through registration
 * 2. Creating a todo item with all fields populated (title, description, priority,
 *    due_date)
 * 3. Retrieving the specific todo by ID
 * 4. Verifying each field type is correctly formatted:
 *
 *    - Title: string with proper length constraints (1-255 characters)
 *    - Description: optional string with max length 5000 or null
 *    - Completed: boolean value
 *    - Priority: enum string (low/medium/high) or null
 *    - Due_date: ISO 8601 date-time format or null
 *    - Completed_at: ISO 8601 date-time format or null
 *    - Created_at: ISO 8601 date-time timestamp
 *    - Updated_at: ISO 8601 date-time timestamp
 *    - Id: UUID v4 format string
 *
 * The test ensures that all field types are properly serialized in API
 * responses and that null/optional fields are correctly represented.
 */
export async function test_api_todo_retrieval_all_field_types(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a todo with all fields populated
  const dueDateFuture = new Date(Date.now() + 86400000 * 7); // 7 days from now
  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 2,
          wordMax: 5,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 2,
          wordMax: 6,
        }),
        priority: "high" as const,
        due_date: dueDateFuture.toISOString(),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Step 3: Retrieve the todo by ID
  const retrievedTodo = await api.functional.todoList.user.todos.at(
    connection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);

  // Step 4: Verify all field types are correctly formatted

  // Verify id is UUID format
  TestValidator.equals(
    "todo id matches UUID format",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.predicate(
    "id is valid UUID v4 format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedTodo.id,
    ),
  );

  // Verify title is string with proper length
  TestValidator.predicate(
    "title is non-empty string",
    typeof retrievedTodo.title === "string" && retrievedTodo.title.length > 0,
  );
  TestValidator.predicate(
    "title length within constraints (1-255)",
    retrievedTodo.title.length >= 1 && retrievedTodo.title.length <= 255,
  );

  // Verify description is string or null
  TestValidator.predicate(
    "description is string or null",
    retrievedTodo.description === null ||
      typeof retrievedTodo.description === "string",
  );
  if (
    retrievedTodo.description !== null &&
    retrievedTodo.description !== undefined
  ) {
    TestValidator.predicate(
      "description length within constraints (0-5000)",
      retrievedTodo.description.length <= 5000,
    );
  }

  // Verify completed is boolean
  TestValidator.predicate(
    "completed is boolean type",
    typeof retrievedTodo.completed === "boolean",
  );

  // Verify priority is enum value or null
  if (retrievedTodo.priority !== null && retrievedTodo.priority !== undefined) {
    TestValidator.predicate(
      "priority is valid enum value",
      ["low", "medium", "high"].includes(retrievedTodo.priority),
    );
  }

  // Verify due_date is ISO 8601 format or null
  if (retrievedTodo.due_date !== null && retrievedTodo.due_date !== undefined) {
    TestValidator.predicate(
      "due_date matches ISO 8601 format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/.test(
        retrievedTodo.due_date,
      ),
    );
  }

  // Verify completed_at is ISO 8601 format or null
  if (
    retrievedTodo.completed_at !== null &&
    retrievedTodo.completed_at !== undefined
  ) {
    TestValidator.predicate(
      "completed_at matches ISO 8601 format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/.test(
        retrievedTodo.completed_at,
      ),
    );
  }

  // Verify created_at is ISO 8601 format
  TestValidator.predicate(
    "created_at matches ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/.test(
      retrievedTodo.created_at,
    ),
  );

  // Verify updated_at is ISO 8601 format
  TestValidator.predicate(
    "updated_at matches ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/.test(
      retrievedTodo.updated_at,
    ),
  );

  // Verify field values match what was created
  TestValidator.equals(
    "title matches created value",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "description matches created value",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "priority matches created value",
    retrievedTodo.priority,
    createdTodo.priority,
  );
  TestValidator.equals(
    "completed status matches default (false)",
    retrievedTodo.completed,
    false,
  );
}
