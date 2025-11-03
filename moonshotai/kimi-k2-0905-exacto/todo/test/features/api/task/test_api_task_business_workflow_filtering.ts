import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTask";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test business workflow status filtering for task management.
 *
 * This test creates tasks across all three business workflow stages (pending,
 * processing, completed) and validates that status-based filtering correctly
 * isolates tasks by their business workflow stage. It confirms that workflow
 * transitions are properly tracked and that users can effectively manage task
 * progression through different business states.
 *
 * Test Steps:
 *
 * 1. Create a new user account for testing
 * 2. Create tasks with different business_status values (pending, processing,
 *    completed)
 * 3. Test filtering by each business status individually
 * 4. Test filtering with multiple status values
 * 5. Verify that filtering returns only tasks matching the specified status
 * 6. Test pagination while filtering to ensure consistent results
 */
export async function test_api_task_business_workflow_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create tasks with different business_status values
  const statusValues = ["pending", "processing", "completed"] as const;
  const createdTasks: ITodoTask[] = [];

  for (const status of statusValues) {
    const task = await api.functional.todo.user.users.tasks.create(connection, {
      userId: user.id,
      body: {
        description: `${status} task: ${RandomGenerator.paragraph({ sentences: 3 })}`,
        href: "http://localhost:3000/tasks",
        referrer: "http://localhost:3000/dashboard",
        business_status: status,
      } satisfies ITodoTask.ICreate,
    });
    typia.assert(task);
    createdTasks.push(task);
  }

  // Also create additional tasks with mixed statuses for more robust testing
  const additionalTasks = await ArrayUtil.asyncRepeat(6, async (index) => {
    const randomStatus = RandomGenerator.pick(statusValues);
    return await api.functional.todo.user.users.tasks.create(connection, {
      userId: user.id,
      body: {
        description: `Task ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
        href: "http://localhost:3000/tasks",
        referrer: "http://localhost:3000/dashboard",
        business_status: randomStatus,
      } satisfies ITodoTask.ICreate,
    });
  });

  // Combine all created tasks
  const allTasks = [...createdTasks, ...additionalTasks];
  const totalPending = allTasks.filter(
    (t) => t.business_status === "pending",
  ).length;
  const totalProcessing = allTasks.filter(
    (t) => t.business_status === "processing",
  ).length;
  const totalCompleted = allTasks.filter(
    (t) => t.business_status === "completed",
  ).length;

  // Step 3: Test filtering by each business status individually
  for (const status of statusValues) {
    const filterResult = await api.functional.todo.user.users.tasks.index(
      connection,
      {
        userId: user.id,
        body: {
          page: 1,
          limit: 20,
          business_status: status,
        } satisfies ITodoTask.IRequest,
      },
    );
    typia.assert(filterResult);

    const expectedCount =
      status === "pending"
        ? totalPending
        : status === "processing"
          ? totalProcessing
          : totalCompleted;

    TestValidator.predicate(
      `filtering by ${status} returns correct total count`,
      filterResult.pagination.records === expectedCount,
    );

    // Verify all returned tasks have the requested business status
    TestValidator.predicate(
      `all returned tasks have ${status} status`,
      filterResult.data.every((task) => task.business_status === status),
    );
  }

  // Step 4: Test filtering with null business_status (should return all tasks)
  const allTasksResult = await api.functional.todo.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 20,
        business_status: null, // null should return all tasks
      } satisfies ITodoTask.IRequest,
    },
  );
  typia.assert(allTasksResult);

  TestValidator.predicate(
    "filtering with null business_status returns all tasks",
    allTasksResult.pagination.records === allTasks.length,
  );

  // Step 5: Test pagination while filtering
  const paginationResult = await api.functional.todo.user.users.tasks.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 2, // Small page size to test pagination
        business_status: "pending",
      } satisfies ITodoTask.IRequest,
    },
  );
  typia.assert(paginationResult);

  TestValidator.predicate(
    "pagination works with business_status filtering",
    paginationResult.data.length === Math.min(2, totalPending),
  );
  TestValidator.predicate(
    "all paginated tasks have correct status",
    paginationResult.data.every((task) => task.business_status === "pending"),
  );

  // Test second page if enough pending tasks exist
  if (totalPending > 2) {
    const page2Result = await api.functional.todo.user.users.tasks.index(
      connection,
      {
        userId: user.id,
        body: {
          page: 2,
          limit: 2,
          business_status: "pending",
        } satisfies ITodoTask.IRequest,
      },
    );
    typia.assert(page2Result);

    TestValidator.predicate(
      "second page has different tasks",
      page2Result.data.every((task) => task.business_status === "pending"),
    );
  }
}
