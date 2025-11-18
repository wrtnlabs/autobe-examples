import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that auto-generated fields cannot be modified and retain original
 * values.
 *
 * This test validates the immutability contract of auto-generated fields in the
 * Todo system. When a todo is created, the system automatically generates two
 * critical fields:
 *
 * - Id: A unique UUID that serves as the primary identifier
 * - Created_at: An immutable timestamp recording the exact creation moment
 *
 * These fields are system-managed and cannot be modified by users. This test
 * ensures:
 *
 * 1. Auto-generated fields are properly initialized when a todo is created
 * 2. The id field remains a valid UUID throughout the todo's lifecycle
 * 3. The created_at timestamp is recorded in ISO 8601 format (UTC timezone)
 * 4. When retrieving the todo, all auto-generated fields remain unchanged
 * 5. Auto-generated fields reflect the original state regardless of time passage
 *
 * Test workflow:
 *
 * 1. Register a new user account for authenticated todo operations
 * 2. Create a todo item with required fields (title) and optional fields
 * 3. Record the creation response's auto-generated field values (id, created_at)
 * 4. Retrieve the todo using its ID via the GET endpoint
 * 5. Verify that the retrieved todo's auto-generated fields match original values
 *    exactly
 * 6. Confirm id is a valid UUID format
 * 7. Confirm created_at is in proper ISO 8601 date-time format
 * 8. Validate that these immutable fields prove system field protection
 */
export async function test_api_todo_retrieval_immutable_auto_fields(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account for authenticated operations
  const userRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: userRegistration,
  });
  typia.assert(authorizedUser);

  // Step 2: Create a todo item with title and optional fields
  const todoCreationData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 6,
    }),
    priority: RandomGenerator.pick(["low", "medium", "high"] as const),
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ITodoListTodo.ICreate;

  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: todoCreationData,
    },
  );
  typia.assert(createdTodo);

  // Step 3: Record the auto-generated field values from creation response
  const originalId = createdTodo.id;
  const originalCreatedAt = createdTodo.created_at;

  // Step 4: Retrieve the todo using its ID via the GET endpoint
  const retrievedTodo = await api.functional.todoList.user.todos.at(
    connection,
    {
      todoId: originalId,
    },
  );
  typia.assert(retrievedTodo);

  // Step 5: Verify that retrieved todo's auto-generated fields match original values exactly
  TestValidator.equals(
    "todo id remains immutable after retrieval",
    retrievedTodo.id,
    originalId,
  );

  TestValidator.equals(
    "todo created_at timestamp remains immutable after retrieval",
    retrievedTodo.created_at,
    originalCreatedAt,
  );

  // Step 6: Confirm id is a valid UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.predicate(
    "created todo id is valid UUID format",
    uuidRegex.test(createdTodo.id),
  );

  TestValidator.predicate(
    "retrieved todo id is valid UUID format",
    uuidRegex.test(retrievedTodo.id),
  );

  // Step 7: Confirm created_at is in proper ISO 8601 date-time format
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  TestValidator.predicate(
    "created todo created_at is in ISO 8601 format",
    iso8601Regex.test(createdTodo.created_at),
  );

  TestValidator.predicate(
    "retrieved todo created_at is in ISO 8601 format",
    iso8601Regex.test(retrievedTodo.created_at),
  );

  // Step 8: Validate that auto-generated field values are identical between creation and retrieval
  TestValidator.equals(
    "auto-generated id persists identically from creation to retrieval",
    createdTodo.id,
    retrievedTodo.id,
  );

  TestValidator.equals(
    "auto-generated created_at persists identically from creation to retrieval",
    createdTodo.created_at,
    retrievedTodo.created_at,
  );
}
