import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListTaskArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTaskArray";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_tasks_retrieval_mixed_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user to establish identity for task operations
  const authResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection);
  typia.assert(authResponse);

  // Step 2: Create multiple tasks with default incomplete status
  const taskTitles = [
    "Complete API documentation",
    "Review team feedback",
    "Schedule team meeting",
    "Respond to customer emails",
  ];

  const createdTasks: ITodoListTask[] = [];

  // Create all tasks using available API function
  for (const title of taskTitles) {
    const task: ITodoListTask = await api.functional.todoList.tasks.create(
      connection,
      {
        body: {
          title,
        } satisfies ITodoListTask.ICreate,
      },
    );
    typia.assert(task);
    createdTasks.push(task);
  }

  // Step 3: Retrieve all tasks
  const retrievedTasks: ITodoListTaskArray =
    await api.functional.todoList.tasks.index(connection);
  typia.assert(retrievedTasks);

  // Step 4: Validate core business logic
  // - All created tasks are returned
  // - Tasks are ordered newest first
  // - No task is missing or duplicated

  // Validate total count
  TestValidator.equals(
    "all created tasks should be returned",
    retrievedTasks.length,
    createdTasks.length,
  );

  // Create sets of titles for comparison
  const createdTitles = new Set(createdTasks.map((task) => task.title));
  const retrievedTitles = new Set(retrievedTasks.map((task) => task.title));

  // Verify all titles match with no extra or missing
  TestValidator.equals(
    "created and retrieved task titles should match exactly",
    createdTitles.size,
    retrievedTitles.size,
  );

  // Verify every created title exists in retrieved
  for (const title of createdTitles) {
    TestValidator.predicate(
      `created task title '${title}' should exist in retrieved tasks`,
      retrievedTitles.has(title),
    );
  }

  // Verify every retrieved title exists in created
  for (const title of retrievedTitles) {
    TestValidator.predicate(
      `retrieved task title '${title}' should exist in created tasks`,
      createdTitles.has(title),
    );
  }

  // Validate ordering: newest created task should be first
  // The last task created is the newest
  const newestCreatedTask = createdTasks[createdTasks.length - 1];
  const firstRetrievedTask = retrievedTasks[0];

  TestValidator.equals(
    "most recently created task should be first in results",
    firstRetrievedTask.id,
    newestCreatedTask.id,
  );

  TestValidator.equals(
    "most recently created task should have correct title",
    firstRetrievedTask.title,
    newestCreatedTask.title,
  );

  // All tasks should have completion status of false (default)
  for (const task of retrievedTasks) {
    TestValidator.equals(
      `task '${task.title}' should have default completion status of false`,
      task.completed,
      false,
    );
  }
}
