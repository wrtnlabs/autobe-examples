import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoSnapshot";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoLifecycle } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoLifecycle";
import type { ITodoAppTodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoPriority";
import type { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test filtered snapshot retrieval by completion status.
 *
 * Validates that todo snapshot filtering by completion status works correctly.
 * Creates a todo item, performs lifecycle updates including completion, then
 * retrieves snapshots filtered by completion status to ensure accurate
 * filtering.
 */
export async function test_api_todo_snapshots_filter_by_completion(
  connection: api.IConnection,
) {
  // 1. Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        password_hash: userPassword, // Use actual password for hash
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: undefined,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // The authentication token is automatically set in connection headers by the join operation
  // Now we can proceed with authenticated operations

  // 2. Create a todo item
  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        due_date: undefined,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);

  // 3. Perform lifecycle updates to generate snapshots
  // First update: Change status (using realistic status codes)
  const firstUpdate: ITodoAppTodoLifecycle =
    await api.functional.todoApp.user.todos.lifecycle.update(connection, {
      todoId: todo.id,
      body: {
        status: {
          id: typia.random<string & tags.Format<"uuid">>(),
          code: "in-progress",
          name: "In Progress",
          is_active: true,
        } satisfies ITodoAppTodoStatus.ISummary,
        priority: {
          id: typia.random<string & tags.Format<"uuid">>(),
          code: "medium",
          name: "Medium Priority",
          description: "Normal priority level",
          weight: 50,
          is_active: true,
          created_at: new Date().toISOString(),
        } satisfies ITodoAppTodoPriority.ISummary,
        updated_at: new Date().toISOString(),
      } satisfies ITodoAppTodoLifecycle.IUpdate,
    });
  typia.assert(firstUpdate);

  // Second update: Mark as completed
  const secondUpdate: ITodoAppTodoLifecycle =
    await api.functional.todoApp.user.todos.lifecycle.update(connection, {
      todoId: todo.id,
      body: {
        status: {
          id: typia.random<string & tags.Format<"uuid">>(),
          code: "completed",
          name: "Completed",
          is_active: true,
        } satisfies ITodoAppTodoStatus.ISummary,
        updated_at: new Date().toISOString(),
      } satisfies ITodoAppTodoLifecycle.IUpdate,
    });
  typia.assert(secondUpdate);

  // Third update: Reopen todo (creates another snapshot)
  const thirdUpdate: ITodoAppTodoLifecycle =
    await api.functional.todoApp.user.todos.lifecycle.update(connection, {
      todoId: todo.id,
      body: {
        status: {
          id: typia.random<string & tags.Format<"uuid">>(),
          code: "pending",
          name: "Pending",
          is_active: true,
        } satisfies ITodoAppTodoStatus.ISummary,
        updated_at: new Date().toISOString(),
      } satisfies ITodoAppTodoLifecycle.IUpdate,
    });
  typia.assert(thirdUpdate);

  // 4. Test filtering by completion status
  // Get all snapshots (no filter)
  const allSnapshots: IPageITodoAppTodoSnapshot.ISummary =
    await api.functional.todoApp.user.todos.snapshots.index(connection, {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
        completed_only: undefined,
      } satisfies ITodoAppTodoSnapshot.IRequest,
    });
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "should have multiple snapshots",
    allSnapshots.data.length >= 3,
  );

  // Get only completed snapshots
  const completedSnapshots: IPageITodoAppTodoSnapshot.ISummary =
    await api.functional.todoApp.user.todos.snapshots.index(connection, {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
        completed_only: true,
      } satisfies ITodoAppTodoSnapshot.IRequest,
    });
  typia.assert(completedSnapshots);

  // Get non-completed snapshots
  const pendingSnapshots: IPageITodoAppTodoSnapshot.ISummary =
    await api.functional.todoApp.user.todos.snapshots.index(connection, {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
        completed_only: false,
      } satisfies ITodoAppTodoSnapshot.IRequest,
    });
  typia.assert(pendingSnapshots);

  // Validate filtering logic
  TestValidator.predicate(
    "completed snapshots should have completion dates",
    completedSnapshots.data.length === 0 ||
      completedSnapshots.data.every(
        (snapshot) => snapshot.completed_at !== undefined,
      ),
  );

  TestValidator.predicate(
    "pending snapshots should not have completion dates",
    pendingSnapshots.data.every(
      (snapshot) => snapshot.completed_at === undefined,
    ),
  );

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should be valid",
    allSnapshots.pagination.current === 1 &&
      allSnapshots.pagination.limit === 10 &&
      allSnapshots.pagination.records >= 3,
  );

  // Test error scenario: invalid todo ID
  await TestValidator.error("should fail with invalid todo ID", async () => {
    await api.functional.todoApp.user.todos.snapshots.index(connection, {
      todoId: typia.random<string & tags.Format<"uuid">>(), // Random invalid ID
      body: {
        page: 1,
        limit: 10,
        completed_only: true,
      } satisfies ITodoAppTodoSnapshot.IRequest,
    });
  });
}
