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
 * Test dated task workflow including creation with due dates, task completion
 * tracking, and final deletion. Validates complete dated task management where
 * users set due dates, track progress, and clean up completed tasks. Simulates
 * realistic productivity workflows where time-sensitive tasks go through full
 * lifecycle management.
 *
 * 1. Create a new user account for task management
 * 2. Create a task with a due date for time-sensitive workflow testing
 * 3. Track task status and verify due date compliance
 * 4. Update task to completed status
 * 5. Verify task completion tracking
 * 6. Permanently delete the task from the system
 * 7. Validate the complete dated task lifecycle from creation to deletion
 */
export async function test_api_dated_task_workflow_completion(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for task management
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "SecurePass123",
      name: RandomGenerator.name(),
      href: "https://todoapp.example.com/join",
      referrer: "https://todoapp.example.com/home",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a task with a due date for time-sensitive workflow testing
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 10,
      }),
      description: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
      status: "pending",
      priority: RandomGenerator.pick([
        "none",
        "low",
        "medium",
        "high",
      ] as const),
      due_date: dueDate.toISOString(),
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task);

  // Verify task creation and due date
  TestValidator.equals("task title matches", task.title, task.title);
  TestValidator.equals("task status is pending", task.status, "pending");
  TestValidator.predicate(
    "task has due date set",
    task.due_date !== null && task.due_date !== undefined,
  );

  // Step 3: Track task status and verify due date compliance
  const searchResults = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "pending",
        due_before: new Date(Date.now() + 86400000 * 10).toISOString(), // Due within next 10 days
        limit: 10,
        page: 1,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(searchResults);

  // Verify task appears in filtered search results
  TestValidator.predicate(
    "task found in pending tasks with due date filter",
    searchResults.data.some((t) => t.id === task.id),
  );

  // Step 4: Update task to completed status (simulate task completion)
  const completedTaskUpdate = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Completed: " + task.title,
        description: task.description,
        status: "completed",
        priority: task.priority,
        due_date: task.due_date,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(completedTaskUpdate);

  // Step 5: Verify task completion tracking
  const completedSearchResults = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "completed",
        limit: 10,
        page: 1,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(completedSearchResults);

  TestValidator.predicate(
    "completed task appears in completed tasks list",
    completedSearchResults.data.some((t) => t.id === completedTaskUpdate.id),
  );

  // Step 6: Permanently delete the task from the system
  const deletedTask = await api.functional.todoApp.user.tasks.erase(
    connection,
    {
      taskId: completedTaskUpdate.id,
    },
  );
  typia.assert(deletedTask);

  // Verify task was deleted by checking it no longer appears in search results
  const searchAfterDeletion = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        search: completedTaskUpdate.title,
        limit: 10,
        page: 1,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(searchAfterDeletion);

  TestValidator.equals(
    "deleted task not found in search results",
    searchAfterDeletion.data.some((t) => t.id === completedTaskUpdate.id),
    false,
  );

  // Step 7: Validate the complete dated task lifecycle from creation to deletion
  TestValidator.predicate(
    "task had valid due date format",
    task.due_date !== null &&
      task.due_date !== undefined &&
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])/.test(task.due_date),
  );
  TestValidator.predicate(
    "deleted task matches original task ID",
    deletedTask.id === completedTaskUpdate.id,
  );
  TestValidator.predicate(
    "task lifecycle completed successfully",
    task.id !== null &&
      task.status === "pending" &&
      deletedTask.id === task.id &&
      deletedTask.status === "completed",
  );
}
