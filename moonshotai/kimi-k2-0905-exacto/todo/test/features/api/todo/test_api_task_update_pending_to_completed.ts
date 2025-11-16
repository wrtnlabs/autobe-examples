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
 * Test the complete task status update workflow. A user creates a new user
 * account via the join API to establish authentication, then creates a new task
 * with pending status, and finally updates that task from pending to completed
 * status. This validates that the task status changes correctly, completion
 * timestamp is automatically set when marked as completed, and updated_at field
 * reflects the modification time to track when changes occurred.
 *
 * 1. Create new user account through the join API to establish authentication
 *    credentials
 * 2. Create a new task with pending status to prepare for the status update test
 * 3. Update the task status from pending to completed using the PUT API endpoint
 * 4. Verify the updated task has the correct completed status, completion
 *    timestamp, and updated timestamp
 * 5. Retrieve the task again to confirm all changes persist correctly
 */
export async function test_api_task_update_pending_to_completed(
  connection: api.IConnection,
) {
  // Step 1: Create new user account for authentication
  const email = RandomGenerator.paragraph({ sentences: 2 }) + "@example.com";
  const href = "https://example.com/todo";
  const referrer = "https://example.com/home";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: email satisfies string & tags.Format<"email">,
      password: "password123",
      href: href satisfies string & tags.Format<"uri">,
      referrer: referrer satisfies string & tags.Format<"uri">,
      ip: undefined, // Optional field
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create a new task with pending status
  const taskCreate = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Complete project documentation" satisfies string &
          tags.MinLength<1>,
        description: {
          type: "full" satisfies "full",
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
        } satisfies ITodoAppTaskDescription.IFull,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskCreate);

  // Verify initial task has pending status
  TestValidator.equals(
    "Task initially has pending status",
    taskCreate.status,
    "pending",
  );
  TestValidator.predicate(
    "Task completed_at is null when pending",
    taskCreate.completed_at === null,
  );

  // Store initial timestamps for comparison
  const originalUpdatedAt = taskCreate.updated_at;
  const originalCreatedAt = taskCreate.created_at;

  // Step 3: Update task status from pending to completed
  const updatedTask = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: taskCreate.id,
      body: {
        status: "completed",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedTask);

  // Step 4: Verify the status update worked correctly
  TestValidator.equals(
    "Task status changed to completed",
    updatedTask.status,
    "completed",
  );
  TestValidator.predicate(
    "Task completed_at is set when completed",
    updatedTask.completed_at !== null,
  );
  TestValidator.predicate(
    "Task completed_at contains valid timestamp",
    updatedTask.completed_at !== undefined,
  );
  TestValidator.notEquals(
    "Updated_at timestamp changed",
    updatedTask.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "Created_at timestamp unchanged",
    updatedTask.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "Task ID remains the same",
    updatedTask.id,
    taskCreate.id,
  );
  TestValidator.equals(
    "Task user remains the same",
    updatedTask.user.id,
    taskCreate.user.id,
  );

  // Step 5: Retrieve task again to confirm changes persist
  const retrievedTask = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        status: undefined, // Retrieve all tasks to find our specific one
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(retrievedTask);

  // Find our specific task in the results
  const ourTask = retrievedTask.data.find((task) => task.id === taskCreate.id);
  TestValidator.predicate(
    "Task found in retrieved data",
    ourTask !== undefined,
  );

  if (ourTask) {
    TestValidator.equals(
      "Retrieved task has completed status",
      ourTask.status,
      "completed",
    );
    TestValidator.predicate(
      "Retrieved task has completion timestamp",
      ourTask.completed_at !== null,
    );
  }
}
