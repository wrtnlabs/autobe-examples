import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieving todo items with different status values.
 *
 * This test validates that the status enum field correctly persists and
 * retrieves all valid status values ('pending', 'in_progress', 'completed',
 * 'cancelled'). It ensures proper workflow state tracking across the entire
 * todo lifecycle.
 *
 * Test Process:
 *
 * 1. Create authenticated user account
 * 2. Create four todo items, each with a different status value
 * 3. Retrieve each todo item individually
 * 4. Validate that retrieved status matches the created status for each todo
 * 5. Confirm all status enum values are properly supported
 */
export async function test_api_todo_retrieval_different_status_values(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user
  const userCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const user = await api.functional.auth.user.join(connection, {
    body: userCreateData,
  });
  typia.assert(user);

  // Step 2: Define all status values to test
  const statusValues = [
    "pending",
    "in_progress",
    "completed",
    "cancelled",
  ] as const;

  // Step 3: Create todos with each status value and store their IDs
  const createdTodos: Array<{
    status: (typeof statusValues)[number];
    id: string;
  }> = [];

  for (const status of statusValues) {
    const todoCreateData = {
      title: `Todo with status ${status}`,
      description: `Testing ${status} status value`,
      status: status,
      priority: "medium",
      completed: status === "completed",
    } satisfies ITodoListTodo.ICreate;

    const createdTodo = await api.functional.todoList.user.todos.create(
      connection,
      {
        body: todoCreateData,
      },
    );
    typia.assert(createdTodo);

    createdTodos.push({ status, id: createdTodo.id });
  }

  // Step 4: Retrieve each todo and validate status matches
  for (const todoInfo of createdTodos) {
    const retrievedTodo = await api.functional.todoList.user.todos.at(
      connection,
      {
        todoId: todoInfo.id,
      },
    );
    typia.assert(retrievedTodo);

    // Step 5: Validate retrieved status equals created status
    TestValidator.equals(
      `todo with status '${todoInfo.status}' should be retrieved with same status`,
      retrievedTodo.status,
      todoInfo.status,
    );
  }
}
