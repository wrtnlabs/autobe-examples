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
 * Test task creation cycle with deletion functionality.
 *
 * This test validates the complete lifecycle of todo tasks through creation and
 * deletion, simulating natural user behavior where tasks are created and later
 * removed when they become unnecessary or were created by mistake. The workflow
 * tests authentication, task creation, verification of task existence, and
 * final deletion operations.
 *
 * The test follows this sequence:
 *
 * 1. User registration and authentication
 * 2. Task creation with comprehensive data
 * 3. Task verification using search functionality
 * 4. Task deletion operation
 * 5. Confirmation that tasks are properly removed
 *
 * @param connection API connection for test execution
 */
export async function test_api_task_creation_cycle_with_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Initialize user authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "12345678",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
      name: RandomGenerator.name(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Create initial task with comprehensive data
  const taskData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
    status: "pending",
    priority: "medium",
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  } satisfies ITodoAppTask.ICreate;

  const createdTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: taskData,
    },
  );
  typia.assert(createdTask);

  // Verify task was created successfully
  TestValidator.equals("task creation success", createdTask.status, "pending");
  TestValidator.equals("task title matches", createdTask.title, taskData.title);
  TestValidator.equals("task priority set", createdTask.priority, "medium");

  // Search for the created task to confirm it exists in the system
  const searchResults = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: taskData.title,
        status: "pending",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(searchResults);

  // Verify the created task appears in search results
  TestValidator.predicate(
    "task found in search",
    searchResults.data.some((task) => task.id === createdTask.id),
  );
  TestValidator.equals("search returns tasks", searchResults.data.length, 1);

  // Delete the task permanently
  const deletedTask = await api.functional.todoApp.user.tasks.erase(
    connection,
    {
      taskId: createdTask.id,
    },
  );
  typia.assert(deletedTask);

  // Confirm task deletion was successful
  TestValidator.equals(
    "deleted task has same id",
    deletedTask.id,
    createdTask.id,
  );

  // Verify task no longer appears in search results
  const postDeletionResults = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: taskData.title,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(postDeletionResults);

  TestValidator.equals(
    "task no longer exists",
    postDeletionResults.data.length,
    0,
  );

  // Test creating multiple tasks and deleting one
  const task1 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: "First Task",
      status: "pending",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task1);

  const task2 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: "Second Task",
      status: "pending",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task2);

  // Delete only the first task
  await api.functional.todoApp.user.tasks.erase(connection, {
    taskId: task1.id,
  });

  // Verify only the second task remains
  const remainingTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(remainingTasks);

  TestValidator.equals("only one task remains", remainingTasks.data.length, 1);
  TestValidator.equals(
    "remaining task is second task",
    remainingTasks.data[0].title,
    "Second Task",
  );
}
