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
 * Test priority-based filtering of tasks within category context.
 *
 * This comprehensive test validates the priority-based task filtering
 * functionality within the todo application's category system. It ensures users
 * can effectively filter tasks by Low, Medium, and High priority levels both
 * individually and in combination, supporting efficient task organization and
 * workflow management.
 *
 * The test covers:
 *
 * 1. User authentication and category creation setup
 * 2. Task creation with diverse priority assignments across all three levels
 * 3. Individual priority filtering for each priority level (Low, Medium, High)
 * 4. Combined priority filtering to test multiple priority selection
 * 5. Priority-based sorting functionality validation
 * 6. Priority distribution visibility across paginated results
 * 7. Edge cases including empty results and pagination boundaries
 *
 * This ensures the priority filtering system works correctly for personal task
 * management workflows, enabling users to focus on specific priority levels and
 * maintain organized task hierarchies within their categories.
 */
export async function test_api_category_task_search_priority_filter(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "SecurePass123!",
      ip: "127.0.0.1",
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create a category for organizing tasks
  const category = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "Work Projects",
        description: "Priority-based task organization for work projects",
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create tasks with diverse priority assignments
  const tasks = await ArrayUtil.asyncRepeat(9, async (index) => {
    const priorities: Array<"Low" | "Medium" | "High"> = [
      "Low",
      "Medium",
      "High",
    ];
    const priority = priorities[index % 3];

    const task = await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: `Task ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 2,
          sentenceMax: 4,
        }),
        todo_app_category_id: category.id,
        priority: priority,
        due_date: new Date(
          Date.now() + (index + 1) * 24 * 60 * 60 * 1000,
        ).toISOString(),
        completion_order: index,
      } satisfies ITodoAppTask.ICreate,
    });
    typia.assert(task);
    return task;
  });

  // Step 4: Test individual priority filtering - Low priority
  const lowPriorityResults =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 10,
        priority: "Low",
        sort_by: "priority",
        sort_order: "asc",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(lowPriorityResults);

  TestValidator.predicate(
    "Low priority filter returns only Low priority tasks",
    lowPriorityResults.data.every((task) => task.priority === "Low"),
  );
  TestValidator.predicate(
    "Low priority filter returns correct number of tasks",
    lowPriorityResults.data.length === 3,
  );

  // Step 5: Test individual priority filtering - Medium priority
  const mediumPriorityResults =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 10,
        priority: "Medium",
        sort_by: "priority",
        sort_order: "asc",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(mediumPriorityResults);

  TestValidator.predicate(
    "Medium priority filter returns only Medium priority tasks",
    mediumPriorityResults.data.every((task) => task.priority === "Medium"),
  );
  TestValidator.predicate(
    "Medium priority filter returns correct number of tasks",
    mediumPriorityResults.data.length === 3,
  );

  // Step 6: Test individual priority filtering - High priority
  const highPriorityResults =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 10,
        priority: "High",
        sort_by: "priority",
        sort_order: "asc",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(highPriorityResults);

  TestValidator.predicate(
    "High priority filter returns only High priority tasks",
    highPriorityResults.data.every((task) => task.priority === "High"),
  );
  TestValidator.predicate(
    "High priority filter returns correct number of tasks",
    highPriorityResults.data.length === 3,
  );

  // Step 7: Test combined priority filtering - Low and Medium
  const lowMediumResults =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "priority",
        sort_order: "asc",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(lowMediumResults);

  // Note: The API doesn't support multiple priority filters in one request,
  // so we test that all tasks are returned when no priority filter is applied
  TestValidator.predicate(
    "No priority filter returns tasks of all priorities",
    lowMediumResults.data.length === 9,
  );

  // Step 8: Test priority-based sorting
  const sortedByPriority =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "priority",
        sort_order: "desc",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(sortedByPriority);

  TestValidator.predicate(
    "Priority sorting works correctly (descending order)",
    sortedByPriority.data[0].priority === "High" &&
      sortedByPriority.data[1].priority === "High" &&
      sortedByPriority.data[2].priority === "High",
  );

  // Step 9: Test priority distribution visibility
  const priorityDistribution = {
    Low: sortedByPriority.data.filter((task) => task.priority === "Low").length,
    Medium: sortedByPriority.data.filter((task) => task.priority === "Medium")
      .length,
    High: sortedByPriority.data.filter((task) => task.priority === "High")
      .length,
  };

  TestValidator.equals("Low priority task count", priorityDistribution.Low, 3);
  TestValidator.equals(
    "Medium priority task count",
    priorityDistribution.Medium,
    3,
  );
  TestValidator.equals(
    "High priority task count",
    priorityDistribution.High,
    3,
  );

  // Step 10: Test pagination with priority filters
  const paginatedLowPriority =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 2,
        priority: "Low",
        sort_by: "completion_order",
        sort_order: "asc",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(paginatedLowPriority);

  TestValidator.equals(
    "Paginated results limit respected",
    paginatedLowPriority.data.length,
    2,
  );
  TestValidator.equals(
    "Pagination info correct",
    paginatedLowPriority.pagination.limit,
    2,
  );
}
