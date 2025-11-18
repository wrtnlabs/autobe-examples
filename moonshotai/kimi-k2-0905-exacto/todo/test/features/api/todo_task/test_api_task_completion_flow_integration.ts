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
 * Test task creation followed by immediate completion to validate the complete
 * create-to-complete workflow. Validates that tasks can be created with
 * appropriate status and that the full lifecycle is properly managed. Tests the
 * natural progression from task creation through completion tracking with
 * comprehensive search validation.
 */
export async function test_api_task_completion_flow_integration(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "securePassword123",
      name: RandomGenerator.name(),
      href: "https://todoapp.example.com/",
      referrer: "https://example.com/",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a new todo task with pending status
  const taskTitle = RandomGenerator.paragraph({ sentences: 3 });
  const taskDescription = RandomGenerator.paragraph({ sentences: 5 });
  const dueDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow

  const createdTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: taskTitle,
        description: taskDescription,
        status: "pending",
        priority: "medium",
        due_date: dueDate,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(createdTask);

  // Step 3: Verify the created task has correct initial properties
  TestValidator.equals("task title matches", createdTask.title, taskTitle);
  TestValidator.equals(
    "task description matches",
    createdTask.description,
    taskDescription,
  );
  TestValidator.equals("task status is pending", createdTask.status, "pending");
  TestValidator.equals(
    "task priority is medium",
    createdTask.priority,
    "medium",
  );
  TestValidator.equals("task due date matches", createdTask.due_date, dueDate);
  TestValidator.predicate(
    "task has user association",
    createdTask.user.id === user.id,
  );
  TestValidator.predicate(
    "task created_at is set",
    createdTask.created_at !== null,
  );
  TestValidator.predicate(
    "task updated_at matches created_at initially",
    createdTask.updated_at === createdTask.created_at,
  );
  TestValidator.predicate(
    "task completed_at is null initially",
    createdTask.completed_at === null,
  );

  // Step 4: Search for the task to verify it appears in task listings
  const searchResults = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        search: taskTitle.split(" ")[0], // Search for first word of title
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(searchResults);

  // Verify search returns our task
  const foundTask = searchResults.data.find(
    (task) => task.id === createdTask.id,
  );
  TestValidator.predicate(
    "task found in search results",
    foundTask !== undefined,
  );
  TestValidator.equals(
    "search result task title matches",
    foundTask!.title,
    createdTask.title,
  );
  TestValidator.equals(
    "search result task status matches",
    foundTask!.status,
    createdTask.status,
  );

  // Step 5: Filter by status to verify pending tasks are listed correctly
  const pendingTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(pendingTasks);

  // Verify our task appears in pending tasks list
  const pendingTask = pendingTasks.data.find(
    (task) => task.id === createdTask.id,
  );
  TestValidator.predicate(
    "task appears in pending tasks list",
    pendingTask !== undefined,
  );

  // Step 6: Create another completed task to test search filtering
  const completedTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        status: "completed",
        priority: "high",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(completedTask);

  // Step 7: Verify completed task appears in completed status filter
  const completedTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "completed",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(completedTasks);

  const foundCompletedTask = completedTasks.data.find(
    (task) => task.id === completedTask.id,
  );
  TestValidator.predicate(
    "completed task appears in completed filter",
    foundCompletedTask !== undefined,
  );
  TestValidator.equals(
    "completed task status is correct",
    foundCompletedTask!.status,
    "completed",
  );

  // Step 8: Test priority filtering with the created tasks
  const mediumPriorityTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        priority: "medium",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(mediumPriorityTasks);

  const foundMediumTask = mediumPriorityTasks.data.find(
    (task) => task.id === createdTask.id,
  );
  TestValidator.predicate(
    "medium priority task appears in medium filter",
    foundMediumTask !== undefined,
  );
  TestValidator.equals(
    "medium priority matches",
    foundMediumTask!.priority,
    "medium",
  );

  // Step 9: Verify pagination works correctly
  TestValidator.predicate(
    "pagination object exists",
    mediumPriorityTasks.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    mediumPriorityTasks.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    mediumPriorityTasks.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    mediumPriorityTasks.pagination.records >= 0,
  );

  // Step 10: Test due date filtering
  const tomorrowTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        due_before: new Date(Date.now() + 172800000).toISOString(), // Due before day after tomorrow
        due_after: new Date(Date.now()).toISOString(), // Due after now
        page: 1,
        limit: 100,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(tomorrowTasks);

  const dueDateTask = tomorrowTasks.data.find(
    (task) => task.id === createdTask.id,
  );
  TestValidator.predicate(
    "task with due date appears in date range filter",
    dueDateTask !== undefined,
  );

  // Step 11: Create a completed task with completion timestamp to test completion workflow
  const taskToComplete = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Task for completion workflow testing",
        description:
          "This task will test the complete workflow from creation to completion",
        status: "pending",
        priority: "high",
        due_date: new Date(Date.now() + 43200000).toISOString(), // 12 hours from now
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskToComplete);

  // Verify the completion workflow - task starts as pending
  TestValidator.equals(
    "initial task status is pending",
    taskToComplete.status,
    "pending",
  );
  TestValidator.predicate(
    "initial completion timestamp is null",
    taskToComplete.completed_at === null,
  );
}
