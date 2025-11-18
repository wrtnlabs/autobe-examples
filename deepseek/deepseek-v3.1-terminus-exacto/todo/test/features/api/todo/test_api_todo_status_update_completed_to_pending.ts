import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating a todo item's status from completed to pending. Authenticated
 * user creates a todo with completed status, then updates it back to pending
 * status. Validates that reverse status transitions work correctly and the
 * updated todo reflects the pending status while preserving other fields.
 */
export async function test_api_todo_status_update_completed_to_pending(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create initial todo with completed status
  const initialTodoData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 12,
    }),
    status: "completed" as const,
  } satisfies ITodoListTodo.ICreate;

  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: initialTodoData,
    },
  );
  typia.assert(createdTodo);

  // Validate initial todo has completed status
  TestValidator.equals(
    "initial todo status should be completed",
    createdTodo.status,
    "completed",
  );
  TestValidator.equals(
    "initial todo title should match",
    createdTodo.title,
    initialTodoData.title,
  );
  TestValidator.equals(
    "initial todo description should match",
    createdTodo.description,
    initialTodoData.description,
  );

  // Step 3: Update todo status from completed to pending
  const updateData = {
    status: "pending" as const,
  } satisfies ITodoListTodo.IUpdate;

  const updatedTodo = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: typia.random<string & tags.Format<"uuid">>(),
      body: updateData,
    },
  );
  typia.assert(updatedTodo);

  // Step 4: Validate the status transition
  TestValidator.equals(
    "updated todo status should be pending",
    updatedTodo.status,
    "pending",
  );
  TestValidator.equals(
    "todo title should remain unchanged",
    updatedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "todo description should remain unchanged",
    updatedTodo.description,
    createdTodo.description,
  );

  // Additional test: Verify that status transitions work in both directions
  const reverseUpdateData = {
    status: "completed" as const,
  } satisfies ITodoListTodo.IUpdate;

  const revertedTodo = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: typia.random<string & tags.Format<"uuid">>(),
      body: reverseUpdateData,
    },
  );
  typia.assert(revertedTodo);

  TestValidator.equals(
    "reverted todo status should be completed",
    revertedTodo.status,
    "completed",
  );
}
