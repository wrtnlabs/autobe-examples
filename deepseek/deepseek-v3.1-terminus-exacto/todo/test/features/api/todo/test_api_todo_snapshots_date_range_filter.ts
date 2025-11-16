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
 * Test snapshot retrieval with date range filtering.
 *
 * Validates that the todo snapshot API correctly filters snapshots based on
 * creation date ranges. Creates a user account, todo item, performs multiple
 * lifecycle updates over time, then tests various date range filters to ensure
 * proper temporal filtering functionality.
 */
export async function test_api_todo_snapshots_date_range_filter(
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
        password_hash: "", // Will be hashed by server
        status: "pending" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: undefined,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create todo item
  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        due_date: undefined,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);

  // 3. Perform lifecycle updates over time to create multiple snapshots
  const snapshotTimestamps: string[] = [];

  // Initial snapshot (creation)
  snapshotTimestamps.push(new Date().toISOString());

  // Update 1: Change status
  await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay
  const lifecycleUpdate1: ITodoAppTodoLifecycle =
    await api.functional.todoApp.user.todos.lifecycle.update(connection, {
      todoId: todo.id,
      body: {
        status: {
          id: typia.random<string & tags.Format<"uuid">>(),
          code: "in-progress",
          name: "In Progress",
          is_active: true,
        } satisfies ITodoAppTodoStatus.ISummary,
        updated_at: new Date().toISOString(),
      } satisfies ITodoAppTodoLifecycle.IUpdate,
    });
  typia.assert(lifecycleUpdate1);
  snapshotTimestamps.push(new Date().toISOString());

  // Update 2: Change priority
  await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay
  const lifecycleUpdate2: ITodoAppTodoLifecycle =
    await api.functional.todoApp.user.todos.lifecycle.update(connection, {
      todoId: todo.id,
      body: {
        priority: {
          id: typia.random<string & tags.Format<"uuid">>(),
          code: "high",
          name: "High",
          description: "High priority task",
          weight: 90,
          is_active: true,
          created_at: new Date().toISOString(),
        } satisfies ITodoAppTodoPriority.ISummary,
        updated_at: new Date().toISOString(),
      } satisfies ITodoAppTodoLifecycle.IUpdate,
    });
  typia.assert(lifecycleUpdate2);
  snapshotTimestamps.push(new Date().toISOString());

  // Update 3: Mark as completed
  await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay
  const lifecycleUpdate3: ITodoAppTodoLifecycle =
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
  typia.assert(lifecycleUpdate3);
  snapshotTimestamps.push(new Date().toISOString());

  // Sort timestamps chronologically
  snapshotTimestamps.sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  // 4. Test date range filtering with various ranges

  // Test 1: Get all snapshots (no date filter)
  const allSnapshots: IPageITodoAppTodoSnapshot.ISummary =
    await api.functional.todoApp.user.todos.snapshots.index(connection, {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "snapshot_created_at" as const,
        order: "asc" as const,
      } satisfies ITodoAppTodoSnapshot.IRequest,
    });
  typia.assert(allSnapshots);
  TestValidator.equals(
    "should return multiple snapshots",
    allSnapshots.data.length > 0,
    true,
  );

  // Test 2: Filter by created_after (middle timestamp)
  const middleTimestamp =
    snapshotTimestamps[Math.floor(snapshotTimestamps.length / 2)];
  const recentSnapshots: IPageITodoAppTodoSnapshot.ISummary =
    await api.functional.todoApp.user.todos.snapshots.index(connection, {
      todoId: todo.id,
      body: {
        created_after: middleTimestamp,
        sort_by: "snapshot_created_at" as const,
        order: "asc" as const,
      } satisfies ITodoAppTodoSnapshot.IRequest,
    });
  typia.assert(recentSnapshots);

  // Verify all returned snapshots are after the filter date
  if (recentSnapshots.data.length > 0) {
    const filterDate = new Date(middleTimestamp);
    recentSnapshots.data.forEach((snapshot) => {
      const snapshotDate = new Date(snapshot.snapshot_created_at);
      TestValidator.predicate(
        "snapshot should be after filter date",
        snapshotDate >= filterDate,
      );
    });
  }

  // Test 3: Filter by created_before (middle timestamp)
  const olderSnapshots: IPageITodoAppTodoSnapshot.ISummary =
    await api.functional.todoApp.user.todos.snapshots.index(connection, {
      todoId: todo.id,
      body: {
        created_before: middleTimestamp,
        sort_by: "snapshot_created_at" as const,
        order: "asc" as const,
      } satisfies ITodoAppTodoSnapshot.IRequest,
    });
  typia.assert(olderSnapshots);

  // Verify all returned snapshots are before the filter date
  if (olderSnapshots.data.length > 0) {
    const filterDate = new Date(middleTimestamp);
    olderSnapshots.data.forEach((snapshot) => {
      const snapshotDate = new Date(snapshot.snapshot_created_at);
      TestValidator.predicate(
        "snapshot should be before filter date",
        snapshotDate <= filterDate,
      );
    });
  }

  // Test 4: Combined date range filter
  const startDate = snapshotTimestamps[0];
  const endDate = snapshotTimestamps[snapshotTimestamps.length - 1];

  const rangeSnapshots: IPageITodoAppTodoSnapshot.ISummary =
    await api.functional.todoApp.user.todos.snapshots.index(connection, {
      todoId: todo.id,
      body: {
        created_after: startDate,
        created_before: endDate,
        sort_by: "snapshot_created_at" as const,
        order: "asc" as const,
      } satisfies ITodoAppTodoSnapshot.IRequest,
    });
  typia.assert(rangeSnapshots);

  // Verify snapshots are within the specified range
  if (rangeSnapshots.data.length > 0) {
    const startFilterDate = new Date(startDate);
    const endFilterDate = new Date(endDate);

    rangeSnapshots.data.forEach((snapshot) => {
      const snapshotDate = new Date(snapshot.snapshot_created_at);
      TestValidator.predicate(
        "snapshot should be within date range",
        snapshotDate >= startFilterDate && snapshotDate <= endFilterDate,
      );
    });
  }

  // Test 5: Empty result for non-matching date range
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const emptySnapshots: IPageITodoAppTodoSnapshot.ISummary =
    await api.functional.todoApp.user.todos.snapshots.index(connection, {
      todoId: todo.id,
      body: {
        created_after: futureDate,
        sort_by: "snapshot_created_at" as const,
        order: "asc" as const,
      } satisfies ITodoAppTodoSnapshot.IRequest,
    });
  typia.assert(emptySnapshots);
  TestValidator.equals(
    "future date filter should return empty",
    emptySnapshots.data.length,
    0,
  );

  // Validate pagination information
  TestValidator.predicate(
    "pagination should have valid current page",
    allSnapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    allSnapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    allSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    allSnapshots.pagination.pages >= 0,
  );

  // Additional validation: Verify snapshot structure
  if (allSnapshots.data.length > 0) {
    const firstSnapshot = allSnapshots.data[0];
    TestValidator.predicate(
      "snapshot should have valid ID",
      firstSnapshot.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot should have todo reference",
      firstSnapshot.todo_app_todo_id.length > 0,
    );
    TestValidator.predicate(
      "snapshot should have status reference",
      firstSnapshot.todo_app_todo_status_id.length > 0,
    );
    TestValidator.predicate(
      "snapshot should have creation timestamp",
      firstSnapshot.snapshot_created_at.length > 0,
    );

    // Validate status object
    TestValidator.predicate(
      "status should have valid ID",
      firstSnapshot.status.id.length > 0,
    );
    TestValidator.predicate(
      "status should have code",
      firstSnapshot.status.code.length > 0,
    );
    TestValidator.predicate(
      "status should have name",
      firstSnapshot.status.name.length > 0,
    );
    TestValidator.predicate(
      "status should have active flag",
      typeof firstSnapshot.status.is_active === "boolean",
    );
  }
}
