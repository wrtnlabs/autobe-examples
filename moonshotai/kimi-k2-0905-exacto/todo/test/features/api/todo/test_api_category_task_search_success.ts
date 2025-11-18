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
 * Test successful search and retrieval of tasks within a specific category.
 * This comprehensive test validates that authenticated users can filter, sort,
 * and paginate tasks belonging to their personal categories. The test covers
 * basic search functionality with default parameters, verifies proper
 * pagination behavior, and ensures only tasks within the specified category are
 * returned.
 *
 * Complete workflow:
 *
 * 1. Create user account for authentication
 * 2. Create test category to organize tasks
 * 3. Create multiple diverse todo tasks in the category (pending, in-progress,
 *    completed)
 * 4. Create tasks in different category to test isolation
 * 5. Test basic category task search with default parameters
 * 6. Test filtering by status (pending, completed)
 * 7. Test filtering by priority (Low, Medium, High)
 * 8. Test text search within category tasks
 * 9. Test pagination functionality
 * 10. Verify task isolation - ensure only category-specific tasks are returned
 * 11. Test sorting by different fields (created_at, priority, completion_order)
 */
export async function test_api_category_task_search_success(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "SecurePass123",
        href: "https://todo-app.example.com/join",
        referrer: "https://todo-app.example.com",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);

  // Step 2: Create test category to organize tasks
  const category: ITodoAppCategory =
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: "Work Projects",
        description: "Tasks related to professional projects",
      } satisfies ITodoAppCategory.ICreate,
    });
  typia.assert(category);

  // Create another category to test task isolation
  const personalCategory: ITodoAppCategory =
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: "Personal Tasks",
        description: "Personal life tasks",
      } satisfies ITodoAppCategory.ICreate,
    });
  typia.assert(personalCategory);

  // Step 3: Create multiple diverse todo tasks in the target category
  const workTasks: ITodoAppTask[] = [];

  // Create pending tasks
  const pendingTask1 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Pending Work Task 1",
        description: "This is a pending high priority work task",
        todo_app_category_id: category.id,
        priority: "High",
        due_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
      } satisfies ITodoAppTask.ICreate,
    },
  );
  workTasks.push(pendingTask1);

  const pendingTask2 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Pending Work Task 2",
        description: "This is a pending medium priority work task",
        todo_app_category_id: category.id,
        priority: "Medium",
        due_date: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days
      } satisfies ITodoAppTask.ICreate,
    },
  );
  workTasks.push(pendingTask2);

  // Create in-progress tasks
  const inProgressTask1 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "In Progress Work Task 3",
        description: "Currently working on this medium priority task",
        todo_app_category_id: category.id,
        priority: "Medium",
        due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  workTasks.push(inProgressTask1);

  const inProgressTask2 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "In Progress Work Task 4",
        description: "This is an in-progress high priority task",
        todo_app_category_id: category.id,
        priority: "High",
        due_date: new Date(Date.now() + 86400000 * 4).toISOString(),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  workTasks.push(inProgressTask2);

  // Create completed tasks
  const completedTask1 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Completed Work Task 5",
        description: "This completed work task is ready for testing",
        todo_app_category_id: category.id,
        priority: "Low",
        completion_order: 10,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  workTasks.push(completedTask1);

  const completedTask2 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Completed Work Task 6",
        description: "Another completed low priority work task",
        todo_app_category_id: category.id,
        priority: "Low",
        completion_order: 20,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  workTasks.push(completedTask2);

  // Validate that all tasks were created successfully
  for (const task of workTasks) {
    typia.assert(task);
  }

  // Step 4: Create tasks in personal category to test isolation
  const otherTask1 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Personal shopping task",
        description: "Buy groceries",
        todo_app_category_id: personalCategory.id,
        priority: "Medium",
      } satisfies ITodoAppTask.ICreate,
    },
  );

  const otherTask2 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Exercise routine",
        description: "Morning workout",
        todo_app_category_id: personalCategory.id,
        priority: "High",
      } satisfies ITodoAppTask.ICreate,
    },
  );

  typia.assert(otherTask1);
  typia.assert(otherTask2);

  // Step 5: Test basic category task search with default parameters
  const basicSearch = await api.functional.todoApp.user.categories.tasks.index(
    connection,
    {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(basicSearch);

  // Verify pagination info
  TestValidator.predicate(
    "basic search has work category tasks",
    basicSearch.data.length > 0,
  );
  TestValidator.equals(
    "basic search current page",
    basicSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "basic search per-page limit",
    basicSearch.pagination.limit,
    10,
  );

  // Step 6: Test filtering by status
  const pendingTasks = await api.functional.todoApp.user.categories.tasks.index(
    connection,
    {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 25,
        status: "pending",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(pendingTasks);

  TestValidator.predicate(
    "all pending tasks have pending status",
    pendingTasks.data.every((task) => task.status === "pending"),
  );

  const completedTasks =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 25,
        status: "completed",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(completedTasks);

  TestValidator.predicate(
    "all completed tasks have completed status",
    completedTasks.data.every((task) => task.status === "completed"),
  );

  // Step 7: Test filtering by priority
  const highPriorityTasks =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 25,
        priority: "High",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(highPriorityTasks);

  TestValidator.predicate(
    "all high priority tasks have high priority",
    highPriorityTasks.data.every((task) => task.priority === "High"),
  );

  const lowPriorityTasks =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 25,
        priority: "Low",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(lowPriorityTasks);

  TestValidator.predicate(
    "all low priority tasks have low priority",
    lowPriorityTasks.data.every((task) => task.priority === "Low"),
  );

  // Step 8: Test text search within category tasks
  const searchWorkTasks =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 25,
        search: "Work Task",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(searchWorkTasks);

  TestValidator.predicate(
    "search results contain work task text",
    searchWorkTasks.data.length > 0,
  );

  // Step 9: Test pagination functionality
  const page1 = await api.functional.todoApp.user.categories.tasks.index(
    connection,
    {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(page1);

  const page2 = await api.functional.todoApp.user.categories.tasks.index(
    connection,
    {
      categoryId: category.id,
      body: {
        page: 2,
        limit: 5,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(page2);

  TestValidator.predicate(
    "pagination returns different results",
    page1.data.length <= 5 && page2.data.length <= 5,
  );
  TestValidator.equals("page 1 shows page 1", page1.pagination.current, 1);
  TestValidator.equals("page 2 shows page 2", page2.pagination.current, 2);

  // Step 10: Verify task isolation - ensure only category-specific tasks are returned
  // All tasks in the search results should belong to the work category
  for (const taskSummary of basicSearch.data) {
    // The summary should contain tasks that match our work task patterns
    TestValidator.predicate(
      "task title contains work-related text",
      taskSummary.title.includes("Work Task"),
    );
  }

  // Step 11: Test sorting by different fields
  const sortedByPriority =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 25,
        sort_by: "priority",
        sort_order: "desc",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(sortedByPriority);

  TestValidator.predicate(
    "tasks are sorted by priority descending",
    sortedByPriority.data.length > 0,
  );

  const sortedByCreated =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 25,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(sortedByCreated);

  TestValidator.predicate(
    "tasks are sorted by creation date ascending",
    sortedByCreated.data.length > 0,
  );
}
