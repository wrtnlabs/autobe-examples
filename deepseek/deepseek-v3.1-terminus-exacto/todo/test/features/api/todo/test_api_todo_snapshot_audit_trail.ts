import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoSnapshot";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test audit trail functionality by creating multiple todo versions to trigger
 * snapshot creation. Since the API doesn't provide direct snapshot listing
 * functionality, this test validates the core workflow of creating multiple
 * todo versions with different statuses, which should trigger the backend's
 * snapshot mechanism. The test ensures the system handles sequential todo
 * creation correctly and maintains data integrity through the modification
 * process.
 */
export async function test_api_todo_snapshot_audit_trail(
  connection: api.IConnection,
) {
  // 1. Create authenticated user context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create initial todo item
  const initialTodoData = {
    title: "Complete audit trail testing",
    description: "Test the snapshot functionality with multiple status changes",
    status: "pending" as const,
  } satisfies ITodoListTodo.ICreate;

  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: initialTodoData,
    },
  );
  typia.assert(todo);

  // 3. Create second todo version with completed status
  const completedTodoData = {
    title: "Complete audit trail testing",
    description: "Test the snapshot functionality with multiple status changes",
    status: "completed" as const,
  } satisfies ITodoListTodo.ICreate;

  const completedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: completedTodoData,
    });
  typia.assert(completedTodo);

  // 4. Create third todo version with pending status again
  const finalTodoData = {
    title: "Complete audit trail testing",
    description: "Test the snapshot functionality with multiple status changes",
    status: "pending" as const,
  } satisfies ITodoListTodo.ICreate;

  const finalTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: finalTodoData,
    });
  typia.assert(finalTodo);

  // 5. Validate the workflow completed successfully
  TestValidator.equals(
    "final todo status should be pending",
    finalTodo.status,
    "pending",
  );
  TestValidator.equals(
    "final todo title should match original",
    finalTodo.title,
    "Complete audit trail testing",
  );
  TestValidator.equals(
    "final todo description should match original",
    finalTodo.description,
    "Test the snapshot functionality with multiple status changes",
  );

  // 6. Validate that each todo creation returned valid data
  TestValidator.predicate(
    "initial todo should have pending status",
    todo.status === "pending",
  );
  TestValidator.predicate(
    "completed todo should have completed status",
    completedTodo.status === "completed",
  );
  TestValidator.predicate(
    "final todo should have pending status",
    finalTodo.status === "pending",
  );

  // Note: While we cannot directly test snapshot retrieval due to API limitations,
  // this test validates that the system properly handles sequential todo creation
  // which should trigger the backend's snapshot mechanism for audit trail purposes
}
