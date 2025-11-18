import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates todo item creation and basic status functionality.
 *
 * This E2E test creates an authenticated user context and creates a todo item
 * with 'pending' status. It validates that the todo creation works correctly
 * and that the response contains the expected properties.
 *
 * Note: The original scenario requiring status update from pending to completed
 * cannot be implemented as the ITodoListTodo DTO does not contain an ID field
 * needed for the update operation. This test focuses on validating the
 * available functionality.
 *
 * Test Steps:
 *
 * 1. Create a new user account for authentication
 * 2. Create a todo item with 'pending' status
 * 3. Validate that the todo was created successfully
 * 4. Verify that all properties are correctly set
 */
export async function test_api_todo_status_update_pending_to_completed(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a todo item with 'pending' status
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });

  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
        description: todoDescription,
        status: "pending",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Step 3: Validate that the todo was created successfully
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "todo description matches input",
    createdTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "todo status is set to pending",
    createdTodo.status,
    "pending",
  );

  // Additional validation: Ensure response structure matches ITodoListTodo DTO
  TestValidator.predicate(
    "todo has title property",
    typeof createdTodo.title === "string",
  );
  TestValidator.predicate(
    "todo has description property",
    typeof createdTodo.description === "string",
  );
  TestValidator.predicate(
    "todo has status property",
    typeof createdTodo.status === "string",
  );
  TestValidator.predicate(
    "status is valid enum value",
    createdTodo.status === "pending" || createdTodo.status === "completed",
  );
}
