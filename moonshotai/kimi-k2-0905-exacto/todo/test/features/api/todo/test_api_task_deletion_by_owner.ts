import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTask";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful task deletion by the task owner.
 *
 * This comprehensive test validates the complete task deletion workflow:
 *
 * 1. User creates an authenticated account for task management operations
 * 2. User creates a task to be deleted for testing purposes
 * 3. User searches their tasks to verify the task exists before deletion
 * 4. User permanently deletes the task from their personal task list
 * 5. User attempts to retrieve tasks again to confirm deletion was successful
 *
 * The test ensures proper authentication, task ownership verification, and
 * permanent deletion functionality while validating data consistency throughout
 * the process.
 */
export async function test_api_task_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account to perform task operations
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joinData = {
    email: userEmail,
    password: "securePassword123",
    ip: "127.0.0.1",
    href: "https://example.com/todo",
    referrer: "https://example.com/",
  } satisfies ITodoAppUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: joinData,
  });
  typia.assert(user);

  // Step 2: Create a task specifically for deletion testing
  const taskTitle = RandomGenerator.paragraph({ sentences: 3 });
  const taskDescription = RandomGenerator.content({ paragraphs: 2 });

  const createData = {
    title: taskTitle,
    description: {
      type: "full" as const,
      content: taskDescription,
    },
  } satisfies ITodoAppTask.ICreate;

  const createdTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: createData,
    },
  );
  typia.assert(createdTask);

  // Validate task properties
  TestValidator.equals("task title matches", createdTask.title, taskTitle);
  TestValidator.equals("task status is pending", createdTask.status, "pending");
  TestValidator.equals("task has owner", createdTask.user.id, user.id);

  // Step 3: Search for tasks to verify the task exists before deletion
  const searchTerm =
    taskTitle.length > 10 ? taskTitle.substring(0, 10) : taskTitle;
  const searchBeforeDeletion = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: searchTerm,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(searchBeforeDeletion);

  TestValidator.predicate(
    "search results contain task",
    searchBeforeDeletion.data.some((task) => task.id === createdTask.id),
  );
  const foundTaskBefore = searchBeforeDeletion.data.find(
    (task) => task.id === createdTask.id,
  );
  TestValidator.equals(
    "found task title matches",
    foundTaskBefore?.title,
    taskTitle,
  );

  // Step 4: Delete the task permanently
  await api.functional.todoApp.user.tasks.erase(connection, {
    taskId: createdTask.id,
  });

  // Step 5: Verify task is deleted by searching again
  const searchAfterDeletion = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50, // Higher limit to ensure comprehensive search
        search: searchTerm,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(searchAfterDeletion);

  TestValidator.predicate(
    "deleted task not found in search",
    !searchAfterDeletion.data.some((task) => task.id === createdTask.id),
  );

  // Step 6: Verify deletion is complete across all tasks
  const allTasks = await api.functional.todoApp.user.tasks.index(connection, {
    body: {
      page: 1,
      limit: 100,
    } satisfies ITodoAppTask.IRequest,
  });
  typia.assert(allTasks);

  TestValidator.predicate(
    "task completely removed from system",
    !allTasks.data.some((task) => task.id === createdTask.id),
  );

  // Step 7: Attempt to delete task again to verify proper error handling
  // This should succeed (idempotent behavior) or return appropriate response
  await api.functional.todoApp.user.tasks.erase(connection, {
    taskId: createdTask.id,
  });
}
