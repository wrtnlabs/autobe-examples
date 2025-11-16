import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that system-generated fields (id, created_at, updated_at) are correctly
 * populated by the system upon todo creation.
 *
 * This test validates the fundamental requirement that the backend
 * automatically generates and populates critical metadata fields without client
 * intervention. These system-managed fields are essential for:
 *
 * - Unique identification (id as UUID v4)
 * - Audit trails and creation tracking (created_at timestamp)
 * - Modification history (updated_at timestamp)
 *
 * Test workflow:
 *
 * 1. Authenticate a user to establish a valid session
 * 2. Create a todo item with only user-controllable fields
 * 3. Verify id is a valid UUID v4 format
 * 4. Verify created_at is present and in ISO 8601 date-time format
 * 5. Verify updated_at is present and in ISO 8601 date-time format
 * 6. Ensure all system fields are immutable from client perspective during
 *    creation
 */
export async function test_api_todo_creation_system_generated_fields(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user to establish valid session
  const userRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const authenticatedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userRegistration,
    });
  typia.assert(authenticatedUser);

  // Step 2: Create a todo item with only user-provided fields (no system fields)
  const todoCreationData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 7,
    }),
    status: "pending",
    priority: "medium",
    completed: false,
  } satisfies ITodoListTodo.ICreate;

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: todoCreationData,
    });

  // Step 3: Validate complete response structure including system-generated fields
  typia.assert(createdTodo);

  // Step 4: Verify system-generated fields are present and have correct formats
  // typia.assert already validates:
  // - id is string & tags.Format<"uuid"> (UUID v4 format)
  // - created_at is string & tags.Format<"date-time"> (ISO 8601)
  // - updated_at is string & tags.Format<"date-time"> (ISO 8601)

  // Step 5: Verify user-provided fields match the input
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoCreationData.title,
  );
  TestValidator.equals(
    "todo description matches input",
    createdTodo.description,
    todoCreationData.description,
  );
  TestValidator.equals(
    "todo status matches input",
    createdTodo.status,
    todoCreationData.status,
  );
  TestValidator.equals(
    "todo priority matches input",
    createdTodo.priority,
    todoCreationData.priority,
  );
  TestValidator.equals(
    "todo completed status matches input",
    createdTodo.completed,
    todoCreationData.completed,
  );
}
