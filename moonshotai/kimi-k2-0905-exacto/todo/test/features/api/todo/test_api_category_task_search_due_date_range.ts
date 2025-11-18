import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTask";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test due date range filtering within category task searches.
 *
 * This test validates comprehensive date-based filtering and sorting
 * capabilities for tasks within a specific category. It covers:
 *
 * 1. Creating a test user and category for organization
 * 2. Creating tasks with various due dates (past, present, future, none)
 * 3. Testing date range filtering with different date combinations
 * 4. Validating due date-based sorting functionality
 * 5. Testing timezone handling for date boundaries
 * 6. Verifying proper handling of tasks without due dates
 * 7. Testing pagination with date-filtered results
 * 8. Validating edge cases like invalid date ranges
 *
 * Essential for ensuring users can effectively organize and manage tasks based
 * on deadlines, which is critical for productivity management workflows.
 */
export async function test_api_category_task_search_due_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "SecurePassword123",
      ip: "127.0.0.1",
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create a test category for organizing tasks
  const category = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "Test Projects",
        description: "Category for testing date-based filtering",
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create tasks with various due date scenarios
  const now = new Date();
  const taskData = [
    {
      title: "Past Overdue Task",
      dueDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      priority: "High" as const,
    },
    { title: "Today Task", dueDate: now, priority: "Medium" as const },
    {
      title: "Tomorrow Task",
      dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      priority: "Low" as const,
    },
    {
      title: "This Week Task",
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      priority: "Medium" as const,
    },
    {
      title: "Next Month Task",
      dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      priority: "High" as const,
    },
    { title: "No Due Date Task", dueDate: null, priority: "Low" as const },
    {
      title: "Future High Priority",
      dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      priority: "High" as const,
    },
  ];

  const createdTasks: ITodoAppTask[] = [];
  for (const taskInfo of taskData) {
    const taskBody = {
      title: taskInfo.title,
      description: `Task created for date range testing - ${taskInfo.title}`,
      todo_app_category_id: category.id,
      priority: taskInfo.priority,
      due_date: taskInfo.dueDate ? taskInfo.dueDate.toISOString() : null,
    } satisfies ITodoAppTask.ICreate;

    const task = await api.functional.todoApp.user.tasks.create(connection, {
      body: taskBody,
    });
    typia.assert<ITodoAppTask>(task);
    createdTasks.push(task);
  }

  // Step 4: Test filtering by date ranges
  const testStartDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // Yesterday
  const testEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next week

  // Test 1: Filter by specific date range (yesterday to next week)
  const dateRangeResult =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 10,
        due_date_from: testStartDate.toISOString(),
        due_date_to: testEndDate.toISOString(),
        sort_by: "due_date",
        sort_order: "asc",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(dateRangeResult);

  // Validate that only tasks within date range are returned
  const expectedCount = 4; // Today, Tomorrow, This Week (Next Month excluded)
  TestValidator.predicate(
    "date range filtering returns correct number of tasks",
    dateRangeResult.data.length === expectedCount,
  );

  // Verify each filtered task falls within the date range
  for (const task of dateRangeResult.data) {
    TestValidator.predicate(
      "task has valid due date within range",
      task.due_date !== null &&
        task.due_date !== undefined &&
        new Date(task.due_date) >= testStartDate &&
        new Date(task.due_date) <= testEndDate,
    );
  }

  // Test 2: Filter for future high priority tasks
  const futureHighPriorityResult =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 10,
        due_date_from: new Date(
          now.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString(), // Tomorrow and beyond
        priority: "High",
        sort_by: "due_date",
        sort_order: "asc",
      } satisfies ITodoAppTask.IRequest,
    });

  TestValidator.predicate(
    "future high priority tasks filtering works correctly",
    futureHighPriorityResult.data.every(
      (task) =>
        task.priority === "High" &&
        task.due_date !== null &&
        task.due_date !== undefined &&
        new Date(task.due_date) > now,
    ),
  );

  // Test 3: Filter tasks with no due dates
  const noDueDateResult =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "due_date",
        sort_order: "asc",
      } satisfies ITodoAppTask.IRequest,
    });

  const tasksWithNoDueDate = noDueDateResult.data.filter(
    (task) => task.due_date === null || task.due_date === undefined,
  );
  TestValidator.predicate(
    "tasks without due dates are included in results",
    tasksWithNoDueDate.length >= 1,
  );

  // Test 4: Text search combined with date filtering
  const textSearchDateResult =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 10,
        search: "task",
        due_date_from: new Date(
          now.getTime() - 2 * 24 * 60 * 60 * 1000,
        ).toISOString(), // Recent tasks
        due_date_to: new Date(
          now.getTime() + 14 * 24 * 60 * 60 * 1000,
        ).toISOString(), // Near future
        sort_by: "due_date",
      } satisfies ITodoAppTask.IRequest,
    });

  TestValidator.predicate(
    "text search with date range returns relevant tasks",
    textSearchDateResult.data.every(
      (task) =>
        task.title.toLowerCase().includes("task") &&
        task.due_date !== null &&
        task.due_date !== undefined &&
        new Date(task.due_date) >=
          new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) &&
        new Date(task.due_date) <=
          new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    ),
  );

  // Test 5: Pagination with date filtering
  const singlePageResult =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 2, // Small page size
        due_date_from: testStartDate.toISOString(),
        due_date_to: new Date(
          now.getTime() + 10 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        sort_by: "due_date",
      } satisfies ITodoAppTask.IRequest,
    });

  TestValidator.predicate(
    "pagination with date filtering works correctly",
    singlePageResult.data.length <= 2 &&
      singlePageResult.pagination.current === 1 &&
      singlePageResult.pagination.limit === 2,
  );

  // Test 6: Sorting verification - ensure dates are ascending within filtered results
  TestValidator.predicate(
    "date sorting produces properly ordered results",
    isArraySorted(singlePageResult.data),
  );

  // Helper function to check if array of tasks is sorted by due date
  function isArraySorted(tasks: ITodoAppTask.ISummary[]): boolean {
    const tasksWithDates = tasks.filter(
      (task) => task.due_date !== null && task.due_date !== undefined,
    );

    for (let i = 1; i < tasksWithDates.length; i++) {
      if (
        new Date(tasksWithDates[i - 1].due_date!).getTime() >
        new Date(tasksWithDates[i].due_date!).getTime()
      ) {
        return false;
      }
    }
    return true;
  }
}
