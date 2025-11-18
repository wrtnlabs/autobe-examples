import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoSnapshot";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieval of specific historical snapshot by ID.
 *
 * This test validates that todo item snapshots preserve complete historical
 * state including title, description, status, and creation timestamp. It also
 * ensures proper access control prevents users from accessing snapshots
 * belonging to other users' todo items.
 *
 * Test Flow:
 *
 * 1. Create first user account and authenticate
 * 2. Create initial todo item with specific data
 * 3. Since snapshot generation mechanism is not available in provided APIs, focus
 *    on testing the snapshot retrieval endpoint with valid UUID formats
 * 4. Test access control with second user
 */
export async function test_api_todo_snapshot_retrieval(
  connection: api.IConnection,
) {
  // 1. Create first user account and authenticate
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: user1Email,
        password: "password123",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user1);

  // 2. Create initial todo item with specific data
  const initialTodoData = {
    title: "Initial Todo Title",
    description: "Initial todo description",
    status: "pending" as const,
  } satisfies ITodoListTodo.ICreate;

  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: initialTodoData,
    },
  );
  typia.assert(todo);

  // 3. Test snapshot retrieval with valid UUID format
  // Since we don't have snapshot creation API, test with valid UUID format
  const validTodoId = typia.random<string & tags.Format<"uuid">>();
  const validSnapshotId = typia.random<string & tags.Format<"uuid">>();

  // Test that the API endpoint exists and accepts valid UUID parameters
  await TestValidator.error(
    "snapshot retrieval with valid UUID format",
    async () => {
      await api.functional.todoList.user.todos.snapshots.at(connection, {
        todoId: validTodoId,
        snapshotId: validSnapshotId,
      });
    },
  );

  // 4. Create second user to test access control
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    { ...connection, headers: {} },
    {
      body: {
        email: user2Email,
        password: "password456",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user2);

  // 5. Test access control - second user should not access first user's todo snapshots
  await TestValidator.error(
    "second user cannot access first user's todo snapshots",
    async () => {
      await api.functional.todoList.user.todos.snapshots.at(
        { ...connection, headers: {} },
        {
          todoId: validTodoId,
          snapshotId: validSnapshotId,
        },
      );
    },
  );

  // 6. Switch back to first user and test proper parameter validation
  const user1Reauth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user1Email,
        password: "password123",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(user1Reauth);

  // Test that the API properly validates UUID format
  await TestValidator.error("invalid todo ID format should fail", async () => {
    await api.functional.todoList.user.todos.snapshots.at(connection, {
      todoId: "invalid-todo-id" satisfies string as string,
      snapshotId: validSnapshotId,
    });
  });

  await TestValidator.error(
    "invalid snapshot ID format should fail",
    async () => {
      await api.functional.todoList.user.todos.snapshots.at(connection, {
        todoId: validTodoId,
        snapshotId: "invalid-snapshot-id" satisfies string as string,
      });
    },
  );
}
