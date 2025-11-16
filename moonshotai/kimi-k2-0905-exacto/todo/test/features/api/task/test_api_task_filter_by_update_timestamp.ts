import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTask";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_filter_by_update_timestamp(
  connection: api.IConnection,
) {
  // Create user account for task management
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "password123",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Create initial timestamp for reference
  const startTime = new Date();

  // Create base tasks at different times
  const task1 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: "Base Task 1",
      description: {
        type: "full",
        content: "Initial task created for timestamp filtering test",
      } satisfies ITodoAppTaskDescription.IFull,
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task1);

  // Wait short time gap
  await new Promise((resolve) => setTimeout(resolve, 100));

  const task2 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: "Base Task 2",
      description: {
        type: "full",
        content: "Second task for timestamp filtering",
      } satisfies ITodoAppTaskDescription.IFull,
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task2);

  // Wait longer gap
  await new Promise((resolve) => setTimeout(resolve, 200));

  const task3 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: "Base Task 3",
      description: {
        type: "full",
        content: "Third task for filtering validation",
      } satisfies ITodoAppTaskDescription.IFull,
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task3);

  // Record timestamps for filtering ranges
  const beforeFirstUpdate = new Date();

  // Wait and then update specific tasks to create different update timestamps
  await new Promise((resolve) => setTimeout(resolve, 150));

  // Create a task with more recent timestamp (simulating update by recency)
  const task4 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: "Recently Updated Task",
      description: {
        type: "full",
        content: "Task created later with more recent timestamp",
      } satisfies ITodoAppTaskDescription.IFull,
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task4);

  const afterFirstUpdate = new Date();

  // Wait for final timestamp
  await new Promise((resolve) => setTimeout(resolve, 300));

  const finalCutoffTime = new Date();

  // Test filtering with various time ranges
  // Filter for tasks updated after the first update range (should include task4 and any later tasks)
  const recentTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        updated_at: afterFirstUpdate.toISOString(),
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(recentTasks);

  TestValidator.predicate(
    "recent tasks filtered by update timestamp",
    recentTasks.data.length > 0,
  );
  TestValidator.predicate(
    "recent tasks include newly created task",
    recentTasks.data.some((task) => task.id === task4.id),
  );

  // Filter with earlier timestamp to include more tasks
  const earlierTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        updated_at: beforeFirstUpdate.toISOString(),
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(earlierTasks);

  TestValidator.predicate(
    "earlier filter includes more tasks",
    earlierTasks.data.length >= recentTasks.data.length,
  );

  // Test edge case with very recent timestamp (should return empty or minimal results)
  const veryRecentTime = new Date(Date.now() + 5000); // 5 seconds in future
  const futureTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        updated_at: veryRecentTime.toISOString(),
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(futureTasks);

  TestValidator.predicate(
    "future timestamp filter has limited results",
    futureTasks.data.length <= 1,
  );

  // Combine timestamp filtering with other parameters
  const combinedFilteredTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        updated_at: afterFirstUpdate.toISOString(),
        search: "Recently Updated", // Combine with search filter
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(combinedFilteredTasks);

  TestValidator.predicate(
    "combined filtering works correctly",
    combinedFilteredTasks.data.length > 0,
  );
  TestValidator.predicate(
    "combined filter finds expected task",
    combinedFilteredTasks.data.some((task) =>
      task.title.includes("Recently Updated"),
    ),
  );

  // Verify pagination works with timestamp filtering
  const paginatedRecentTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        updated_at: afterFirstUpdate.toISOString(),
        page: 1,
        limit: 2,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(paginatedRecentTasks);

  TestValidator.predicate(
    "pagination with timestamp filtering works",
    paginatedRecentTasks.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination metadata is valid",
    paginatedRecentTasks.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination current page is correct",
    paginatedRecentTasks.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is respected",
    paginatedRecentTasks.pagination.limit === 2,
  );
}
