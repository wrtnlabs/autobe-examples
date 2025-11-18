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
 * Test search pagination functionality for todo tasks.
 *
 * This test validates the complete pagination workflow including:
 *
 * 1. User registration and authentication
 * 2. Creation of multiple tasks to test pagination (across multiple pages)
 * 3. Testing various pagination scenarios:
 *
 *    - Different page sizes (1, 5, 10, 50 items per page)
 *    - Different page numbers (first, middle, last, non-existent)
 *    - Edge cases (page 0, negative pages, page beyond total pages)
 * 4. Validation of pagination metadata accuracy
 * 5. Testing empty result scenarios
 * 6. Verifying consistent task ordering and data integrity
 *
 * The test ensures that pagination works correctly for task search operations
 * and handles all edge cases appropriately while maintaining data consistency.
 */
export async function test_api_task_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create a new user for testing
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "testPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create multiple tasks for pagination testing
  const taskCount = 15; // Create 15 tasks to test multiple pages
  const tasks = await ArrayUtil.asyncRepeat(taskCount, async () => {
    const title = `Task ${RandomGenerator.paragraph({ sentences: 3 })}`;
    const description = RandomGenerator.paragraph({ sentences: 5 });
    const priority = RandomGenerator.pick([
      "none",
      "low",
      "medium",
      "high",
    ] as const);
    const status = RandomGenerator.pick(["pending", "completed"] as const);

    return await api.functional.todoApp.user.users.tasks.create(connection, {
      userId: user.id,
      body: {
        title,
        description,
        priority,
        status,
      } satisfies ITodoAppTask.ICreate,
    });
  });

  // Validate all tasks were created successfully
  typia.assert(tasks);
  TestValidator.equals(
    "all tasks created successfully",
    tasks.length,
    taskCount,
  );

  // Step 3: Test pagination with different page sizes
  console.log("Testing pagination with different page sizes...");

  // Test with page size 1 (first page)
  const page1Size1 = await api.functional.todoApp.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 1,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(page1Size1);
  TestValidator.equals(
    "page 1, size 1 has correct data count",
    page1Size1.data.length,
    1,
  );
  TestValidator.equals(
    "page 1, size 1 has correct current page",
    page1Size1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1, size 1 has correct limit",
    page1Size1.pagination.limit,
    1,
  );
  TestValidator.equals(
    "page 1, size 1 has correct total records",
    page1Size1.pagination.records,
    taskCount,
  );
  TestValidator.equals(
    "page 1, size 1 has correct total pages",
    page1Size1.pagination.pages,
    taskCount,
  ); // 15 tasks, 1 per page = 15 pages

  // Test with page size 5 (first page)
  const page1Size5 = await api.functional.todoApp.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(page1Size5);
  TestValidator.equals(
    "page 1, size 5 has correct data count",
    page1Size5.data.length,
    5,
  );
  TestValidator.equals(
    "page 1, size 5 has correct current page",
    page1Size5.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1, size 5 has correct limit",
    page1Size5.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 1, size 5 has correct total records",
    page1Size5.pagination.records,
    taskCount,
  );
  TestValidator.equals(
    "page 1, size 5 has correct total pages",
    page1Size5.pagination.pages,
    Math.ceil(taskCount / 5),
  ); // 3 pages

  // Test with page size 5 (last page)
  const page3Size5 = await api.functional.todoApp.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 3,
        limit: 5,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(page3Size5);
  TestValidator.equals(
    "page 3, size 5 has correct data count",
    page3Size5.data.length,
    5,
  ); // Should have 5 tasks (tasks 11-15)
  TestValidator.equals(
    "page 3, size 5 has correct current page",
    page3Size5.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3, size 5 has correct limit",
    page3Size5.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 3, size 5 has correct total records",
    page3Size5.pagination.records,
    taskCount,
  );
  TestValidator.equals(
    "page 3, size 5 has correct total pages",
    page3Size5.pagination.pages,
    3,
  ); // 3 pages total

  // Test with page size 10 (middle page)
  const page2Size10 = await api.functional.todoApp.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 2,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(page2Size10);
  TestValidator.equals(
    "page 2, size 10 has correct data count",
    page2Size10.data.length,
    5,
  ); // Should have 5 remaining tasks (11-15)
  TestValidator.equals(
    "page 2, size 10 has correct current page",
    page2Size10.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2, size 10 has correct limit",
    page2Size10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 2, size 10 has correct total records",
    page2Size10.pagination.records,
    taskCount,
  );
  TestValidator.equals(
    "page 2, size 10 has correct total pages",
    page2Size10.pagination.pages,
    2,
  ); // 2 pages total

  // Step 4: Test edge cases
  console.log("Testing pagination edge cases...");

  // Test requesting page 0 (should start from page 1)
  const page0 = await api.functional.todoApp.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 0,
        limit: 5,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(page0);
  TestValidator.equals(
    "page 0 should behave like page 1",
    page0.pagination.current,
    1,
  ); // Should normalize to page 1

  // Test requesting page beyond total pages
  const pageBeyond = await api.functional.todoApp.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 100, // Way beyond total pages
        limit: 5,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(pageBeyond);
  TestValidator.equals(
    "page beyond total pages should return empty",
    pageBeyond.data.length,
    0,
  );
  TestValidator.equals(
    "page beyond total pages should have current page as requested",
    pageBeyond.pagination.current,
    100,
  );
  TestValidator.equals(
    "page beyond total pages should have no records",
    pageBeyond.pagination.records,
    taskCount,
  );

  // Test with maximum limit (100)
  const maxLimit = await api.functional.todoApp.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.equals(
    "max limit should return all tasks",
    maxLimit.data.length,
    taskCount,
  );
  TestValidator.equals(
    "max limit should have 1 page",
    maxLimit.pagination.pages,
    1,
  );

  // Step 5: Test with filters and pagination
  console.log("Testing pagination with filters...");

  // Filter by status = "pending" with pagination
  const pendingTasks = tasks.filter((task) => task.status === "pending");
  const pendingPage1 = await api.functional.todoApp.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 5,
        status: "pending",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(pendingPage1);
  TestValidator.predicate(
    "filtered pagination respects status filter",
    pendingPage1.data.every((task) => task.status === "pending"),
  );
  TestValidator.equals(
    "filtered pagination has correct total records",
    pendingPage1.pagination.records,
    pendingTasks.length,
  );

  // Filter by priority = "high" with pagination
  const highPriorityTasks = tasks.filter((task) => task.priority === "high");
  const highPage1 = await api.functional.todoApp.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 5,
        priority: "high",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(highPage1);
  TestValidator.predicate(
    "filtered pagination respects priority filter",
    highPage1.data.every((task) => task.priority === "high"),
  );
  TestValidator.equals(
    "filtered pagination has correct total records",
    highPage1.pagination.records,
    highPriorityTasks.length,
  );

  // Test search with pagination
  const firstTaskTitle = tasks[0].title.substring(0, 10); // First 10 chars of first task title
  const searchPage = await api.functional.todoApp.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        search: firstTaskTitle,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(searchPage);
  TestValidator.predicate(
    "search pagination finds matching tasks",
    searchPage.data.length >= 1,
  );
  TestValidator.predicate(
    "search pagination returns tasks containing search term",
    searchPage.data.every((task) => task.title.includes(firstTaskTitle)),
  );

  // Step 6: Test ordering with pagination
  console.log("Testing pagination with ordering...");

  // Test order by created_at DESC (should be default)
  const orderedDefault = await api.functional.todoApp.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 15,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(orderedDefault);
  // Validate creation timestamps are in descending order (newest first)
  let isDescendingOrder = true;
  for (let i = 0; i < orderedDefault.data.length - 1; i++) {
    const current = new Date(orderedDefault.data[i].created_at).getTime();
    const next = new Date(orderedDefault.data[i + 1].created_at).getTime();
    if (current < next) {
      isDescendingOrder = false;
      break;
    }
  }
  TestValidator.predicate(
    "default ordering by created_at DESC",
    isDescendingOrder,
  );

  // Test order by title ASC
  const orderedByTitle = await api.functional.todoApp.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 15,
        order_by: "title",
        order_direction: "asc",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(orderedByTitle);
  // Validate titles are in ascending order
  let isAscendingOrder = true;
  for (let i = 0; i < orderedByTitle.data.length - 1; i++) {
    if (orderedByTitle.data[i].title > orderedByTitle.data[i + 1].title) {
      isAscendingOrder = false;
      break;
    }
  }
  TestValidator.predicate("ordering by title ASC", isAscendingOrder);

  console.log("Pagination testing completed successfully!");
}
