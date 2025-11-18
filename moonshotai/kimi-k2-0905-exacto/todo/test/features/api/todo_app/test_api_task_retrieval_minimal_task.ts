import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test retrieval of a task with only required properties (title and status).
 *
 * Validates that minimal tasks are handled correctly and that optional fields
 * appropriately return null values when not set. Ensures the API gracefully
 * handles tasks with sparse data.
 *
 * Step-by-step process:
 *
 * 1. Create a new user account to establish authentication context
 * 2. Create a minimal task containing only title and status
 * 3. Retrieve the minimal task by its ID to test sparse data handling
 * 4. Validate that all required fields are present in response
 * 5. Verify optional fields return null when not provided
 * 6. Confirm user summary information is properly populated
 */
export async function test_api_task_retrieval_minimal_task(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication context
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "securePassword123",
      name: RandomGenerator.name(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: "https://example.com/todo-app",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a minimal task with only title and status
  const taskTitle: string & tags.MaxLength<200> = RandomGenerator.paragraph({
    sentences: 3,
  });
  const taskCreate = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: taskTitle,
        status: "pending",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskCreate);

  // Step 3: Retrieve the minimal task by its unique taskId
  const taskRetrieved = await api.functional.todoApp.user.tasks.at(connection, {
    taskId: taskCreate.id,
  });
  typia.assert(taskRetrieved);

  // Step 4: Validate required fields
  TestValidator.equals("task ID matches", taskRetrieved.id, taskCreate.id);
  TestValidator.equals("task title matches", taskRetrieved.title, taskTitle);
  TestValidator.equals("task status matches", taskRetrieved.status, "pending");
  TestValidator.predicate(
    "created_at exists",
    taskRetrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    taskRetrieved.updated_at !== undefined,
  );
  TestValidator.predicate(
    "user object exists",
    taskRetrieved.user !== undefined,
  );
  TestValidator.equals("user ID matches", taskRetrieved.user.id, user.id);
  TestValidator.equals(
    "user email matches",
    taskRetrieved.user.email,
    userEmail,
  );
  TestValidator.equals(
    "user status matches",
    taskRetrieved.user.status,
    "active",
  );

  // Step 5: Verify optional fields return null/undefined when not provided
  TestValidator.equals(
    "description should be null when not provided",
    taskRetrieved.description,
    null,
  );
  TestValidator.equals(
    "priority should be null when not provided",
    taskRetrieved.priority,
    null,
  );
  TestValidator.equals(
    "due_date should be null when not provided",
    taskRetrieved.due_date,
    null,
  );
  TestValidator.equals(
    "completed_at should be null when not completed",
    taskRetrieved.completed_at,
    null,
  );

  // Step 6: Validate that user display name can be null in minimal tasks
  TestValidator.equals(
    "user name can be null when not provided",
    taskRetrieved.user.name,
    user.name,
  );
  TestValidator.equals(
    "user created_at matches",
    taskRetrieved.user.created_at,
    user.created_at,
  );
}
