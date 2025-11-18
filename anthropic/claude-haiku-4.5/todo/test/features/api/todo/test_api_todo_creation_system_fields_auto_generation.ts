import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that system-generated fields are automatically populated when creating a
 * todo.
 *
 * Validates that the Todo List API correctly auto-generates and initializes
 * system fields:
 *
 * - Id: Auto-generated as valid UUID
 * - Created_at: Set to current UTC time in ISO 8601 format
 * - Updated_at: Set to current UTC time in ISO 8601 format (same as created_at
 *   for new records)
 *
 * Verifies these fields are immutable and timestamp accuracy with proper UTC
 * timezone handling.
 *
 * Steps:
 *
 * 1. Create new user account and obtain authentication
 * 2. Create todo with minimal required fields (title only)
 * 3. Verify id is valid UUID format and generated
 * 4. Verify created_at and updated_at are set to current time in UTC
 * 5. Confirm created_at and updated_at are identical for new records
 * 6. Validate timestamp accuracy and UTC timezone compliance
 */
export async function test_api_todo_creation_system_fields_auto_generation(
  connection: api.IConnection,
) {
  // Step 1: Create new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "securePassword123",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create todo with minimal required fields (title only)
  const todoTitle = RandomGenerator.paragraph({ sentences: 1 });
  const beforeCreation = new Date();

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
      } satisfies ITodoListTodo.ICreate,
    });

  const afterCreation = new Date();
  typia.assert(createdTodo);

  // Step 3: Verify id is valid UUID format and generated
  TestValidator.predicate(
    "id should be a valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdTodo.id,
    ),
  );

  // Step 4: Verify created_at and updated_at are set to current time in UTC ISO 8601 format
  TestValidator.predicate(
    "created_at should be in ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      createdTodo.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at should be in ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      createdTodo.updated_at,
    ),
  );

  // Step 5: Confirm created_at and updated_at are identical for new records
  TestValidator.equals(
    "created_at and updated_at should be identical for new todo",
    createdTodo.created_at,
    createdTodo.updated_at,
  );

  // Step 6: Validate timestamp accuracy - created_at should be between beforeCreation and afterCreation
  const createdAtTime = new Date(createdTodo.created_at);
  TestValidator.predicate(
    "created_at timestamp should be between request start and end",
    createdAtTime >= beforeCreation && createdAtTime <= afterCreation,
  );

  // Validate timestamps are in UTC (should end with Z)
  TestValidator.predicate(
    "created_at should be in UTC timezone (ends with Z)",
    createdTodo.created_at.endsWith("Z"),
  );

  TestValidator.predicate(
    "updated_at should be in UTC timezone (ends with Z)",
    createdTodo.updated_at.endsWith("Z"),
  );

  // Additional validation: title should match what was provided
  TestValidator.equals(
    "todo title should match the provided title",
    createdTodo.title,
    todoTitle,
  );

  // Additional validation: completed should be false by default
  TestValidator.predicate(
    "completed should be false for newly created todo",
    createdTodo.completed === false,
  );
}
