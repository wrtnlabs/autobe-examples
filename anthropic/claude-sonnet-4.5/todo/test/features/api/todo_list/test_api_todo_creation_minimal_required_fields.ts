import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creating a new todo item with only the required 'title' field specified.
 *
 * This test validates that the API correctly handles minimal todo creation by:
 *
 * 1. Accepting a request with only the required title field
 * 2. Applying appropriate default values for omitted optional fields
 * 3. Generating system-managed fields (id, timestamps)
 *
 * The test verifies that:
 *
 * - Status defaults to 'pending'
 * - Completed defaults to false
 * - Optional fields (description, priority, due_date) are null
 * - System fields (id, created_at, updated_at) are properly generated
 */
export async function test_api_todo_creation_minimal_required_fields(
  connection: api.IConnection,
) {
  // Step 1: Create user account and authenticate
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create todo with only required title field
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
      } satisfies ITodoListTodo.ICreate,
    },
  );

  // Step 3: Validate response structure
  typia.assert(createdTodo);

  // Step 4: Verify the title matches what was submitted
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoTitle,
  );

  // Step 5: Verify default values for optional fields
  TestValidator.equals(
    "status defaults to pending",
    createdTodo.status,
    "pending",
  );
  TestValidator.equals(
    "completed defaults to false",
    createdTodo.completed,
    false,
  );
  TestValidator.equals(
    "description is null when not provided",
    createdTodo.description,
    null,
  );
  TestValidator.equals(
    "priority is null when not provided",
    createdTodo.priority,
    null,
  );
  TestValidator.equals(
    "due_date is null when not provided",
    createdTodo.due_date,
    null,
  );
}
