import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTask";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test basic task search and filtering functionality in the Todo application.
 *
 * This test validates the task search and filtering capabilities by:
 *
 * 1. Creating a user account with proper authentication
 * 2. Creating multiple tasks with varied statuses (pending/completed) and
 *    priorities (none/low/medium/high)
 * 3. Testing basic filters - status filtering (pending tasks only)
 * 4. Testing priority filtering (high priority tasks only)
 * 5. Testing combined filtering (pending AND high priority)
 * 6. Verifying pagination functionality with different page sizes
 * 7. Validating text search across task titles
 * 8. Ensuring filters correctly narrow results and maintain data integrity
 *
 * The test ensures users can effectively organize and locate their tasks using
 * the filtering system.
 */
export async function test_api_task_search_basic_filtering(
  connection: api.IConnection,
) {
  // Create user account with email/password authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "SecurePassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Define priority and status options for systematic task creation
  const priorities = ["none", "low", "medium", "high"] as const;
  const statuses = ["pending", "completed"] as const;

  // Create systematic test tasks - 2 of each priority/status combination
  const tasks: ITodoAppTask[] = [];

  // Create 16 tasks (4 priorities × 2 statuses × 2 tasks each)
  for (let i = 0; i < 16; i++) {
    const priority = priorities[i % 4];
    const status = statuses[Math.floor(i / 8)];

    const task = await api.functional.todoApp.user.users.tasks.create(
      connection,
      {
        userId: user.id,
        body: {
          title: `Task ${i + 1} - ${priority} priority ${status}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: priority,
          status: status,
          due_date:
            status === "pending" && Math.random() > 0.3
              ? new Date(
                  Date.now() + (i + 1) * 24 * 60 * 60 * 1000,
                ).toISOString()
              : null,
        } satisfies ITodoAppTask.ICreate,
      },
    );
    typia.assert(task);
    tasks.push(task);
  }

  // Test basic filtering - status=pending only
  TestValidator.predicate("total tasks created", tasks.length === 16);

  const pendingTasksResult =
    await api.functional.todoApp.user.users.tasks.index(connection, {
      userId: user.id,
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(pendingTasksResult);

  // Validate pending tasks filtering works correctly
  TestValidator.predicate(
    'all pending tasks have status="pending"',
    pendingTasksResult.data.every((task) => task.status === "pending"),
  );
  TestValidator.equals(
    "pending tasks page number correct",
    pendingTasksResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending tasks limit correct",
    pendingTasksResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "correct total pending tasks count",
    pendingTasksResult.pagination.records,
    8,
  ); // 8 pending tasks out of 16 total

  // Test priority filtering - priority=high only
  const highPriorityTasksResult =
    await api.functional.todoApp.user.users.tasks.index(connection, {
      userId: user.id,
      body: {
        priority: "high",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(highPriorityTasksResult);

  // Validate high priority tasks filtering
  TestValidator.predicate(
    'all high priority tasks have priority="high"',
    highPriorityTasksResult.data.every((task) => task.priority === "high"),
  );
  TestValidator.equals(
    "high priority tasks page number correct",
    highPriorityTasksResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "high priority tasks limit correct",
    highPriorityTasksResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "correct total high priority tasks count",
    highPriorityTasksResult.pagination.records,
    4,
  ); // 4 high priority tasks (2 pending + 2 completed)

  // Test combined filtering - status=pending AND priority=high
  const pendingHighPriorityResult =
    await api.functional.todoApp.user.users.tasks.index(connection, {
      userId: user.id,
      body: {
        status: "pending",
        priority: "high",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(pendingHighPriorityResult);

  // Validate combined filtering
  TestValidator.predicate(
    "combined filter tasks are all pending AND high priority",
    pendingHighPriorityResult.data.every(
      (task) => task.status === "pending" && task.priority === "high",
    ),
  );
  TestValidator.equals(
    "combined filter page number correct",
    pendingHighPriorityResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter limit correct",
    pendingHighPriorityResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "correct combined filtered task count",
    pendingHighPriorityResult.pagination.records,
    2,
  ); // 2 tasks with both pending + high priority

  // Test pagination - page 1 with 5 items per page
  const page1Size5Result = await api.functional.todoApp.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(page1Size5Result);

  TestValidator.equals(
    "page 1 returns exactly 5 tasks",
    page1Size5Result.data.length,
    5,
  );
  TestValidator.equals(
    "page 1 pagination metadata correct",
    page1Size5Result.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 1 total records correct",
    page1Size5Result.pagination.records,
    16,
  );
  TestValidator.predicate(
    "page 1 current page is 1",
    page1Size5Result.pagination.current === 1,
  );

  // Test pagination - page 2 with 5 items per page
  const page2Size5Result = await api.functional.todoApp.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 2,
        limit: 5,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(page2Size5Result);

  TestValidator.equals(
    "page 2 returns exactly 5 tasks",
    page2Size5Result.data.length,
    5,
  );
  TestValidator.equals(
    "page 2 pagination metadata correct",
    page2Size5Result.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 2 total records correct",
    page2Size5Result.pagination.records,
    16,
  );
  TestValidator.equals(
    "page 2 current page is 2",
    page2Size5Result.pagination.current,
    2,
  );

  // Test pagination handles remaining tasks correctly
  const page4Size5Result = await api.functional.todoApp.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 4,
        limit: 5,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(page4Size5Result);

  TestValidator.equals(
    "page 4 returns remaining 1 task",
    page4Size5Result.data.length,
    1,
  ); // 16 total - 5×3 = 1 remaining

  // Test text search functionality
  const searchResult = await api.functional.todoApp.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        search: "Task 1",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search results contain search term",
    searchResult.data.every((task) => task.title.includes("Task 1")),
  );
  TestValidator.predicate(
    "search respects pagination settings",
    searchResult.pagination.current === 1 &&
      searchResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "search results are reasonable count",
    searchResult.pagination.records > 0 &&
      searchResult.pagination.records <= 16,
  );

  // Test filtering by low priority tasks with due dates
  const lowPriorityWithDue =
    await api.functional.todoApp.user.users.tasks.index(connection, {
      userId: user.id,
      body: {
        priority: "low",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(lowPriorityWithDue);

  TestValidator.predicate(
    "low priority filter works correctly",
    lowPriorityWithDue.data.every((task) => task.priority === "low"),
  );
  TestValidator.equals(
    "low priority tasks count correct",
    lowPriorityWithDue.pagination.records,
    4,
  ); // 4 low priority tasks
}
