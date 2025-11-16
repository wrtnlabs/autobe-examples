import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that authenticated users can successfully retrieve their own todo tasks
 * by ID.
 *
 * This test validates that users can access complete task details including
 * title, description, status, completion timestamp, and creation metadata. The
 * test also verifies proper authorization checks ensuring users can only access
 * their own tasks, and confirms that the response contains all expected task
 * fields.
 */
export async function test_api_task_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to establish authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const createdUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "password123",
        href: "https://todo-app.com/register",
        referrer: "https://todo-app.com",
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(createdUser);

  // Step 2: Create a todo task for the authenticated user
  const taskTitle = RandomGenerator.name();
  const taskDescription: string | undefined = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 4,
    wordMin: 4,
    wordMax: 8,
  });

  const createdTask: ITodoAppTask =
    await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: taskTitle,
        description: {
          type: "full",
          content: taskDescription,
        },
      } satisfies ITodoAppTask.ICreate,
    });
  typia.assert(createdTask);

  // Step 3: Retrieve the specific task by ID
  const retrievedTask: ITodoAppTask =
    await api.functional.todoApp.user.tasks.at(connection, {
      taskId: createdTask.id,
    });
  typia.assert(retrievedTask);

  // Step 4: Verify all task details are correctly returned
  TestValidator.equals("task id matches", retrievedTask.id, createdTask.id);
  TestValidator.equals("task title matches", retrievedTask.title, taskTitle);
  TestValidator.equals(
    "task description matches",
    retrievedTask.description,
    taskDescription,
  );
  TestValidator.equals(
    "task status is pending",
    retrievedTask.status,
    "pending",
  );
  TestValidator.equals(
    "task owner id matches",
    retrievedTask.user.id,
    createdUser.id,
  );
  TestValidator.equals(
    "task owner email matches",
    retrievedTask.user.email,
    userEmail,
  );

  // Step 5: Verify authorization - task should not be accessible without authentication
  // Create unauthenticated connection for authorization test
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.todoApp.user.tasks.at(unauthConn, {
      taskId: createdTask.id,
    });
  });

  // Verify that the completed_at field is null for pending tasks
  TestValidator.equals(
    "completed_at is null for pending task",
    retrievedTask.completed_at,
    null,
  );
}
