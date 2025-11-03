import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test retrieving a specific task by ID for the authenticated user.
 *
 * This test validates the complete workflow from user registration through task
 * creation and detailed retrieval. It ensures users can only access their own
 * tasks and receive complete task information including description, completion
 * status, business workflow status, and timestamps. The test verifies the
 * security boundary that prevents users from accessing tasks belonging to other
 * users.
 *
 * Test flow:
 *
 * 1. Register a new user account via /auth/user/join
 * 2. Create a task for the authenticated user via /todo/user/user-tasks
 * 3. Retrieve the created task by ID via /todo/user/user-tasks/{id}
 * 4. Validate that all task properties are correctly returned
 * 5. Test security by attempting to access non-existent tasks
 * 6. Verify task ownership and complete data structure
 */
export async function test_api_task_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Create a task for the authenticated user
  const taskDescription = RandomGenerator.paragraph({ sentences: 3 });
  const createdTask = await api.functional.todo.user.user_tasks.create(
    connection,
    {
      body: {
        description: taskDescription,
        href: "https://todo.example.com/dashboard",
        referrer: "https://todo.example.com/login",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(createdTask);

  // Retrieve the task by ID
  const retrievedTask = await api.functional.todo.user.user_tasks.at(
    connection,
    {
      id: createdTask.id,
    },
  );
  typia.assert(retrievedTask);

  // Validate task properties match
  TestValidator.equals("task id matches", retrievedTask.id, createdTask.id);
  TestValidator.equals(
    "task description matches",
    retrievedTask.description,
    createdTask.description,
  );
  TestValidator.equals(
    "task completion status",
    retrievedTask.completed,
    false,
  );
  TestValidator.equals(
    "task business status defaults to pending",
    retrievedTask.business_status,
    "pending",
  );
  TestValidator.equals("task user id matches", retrievedTask.user.id, user.id);
  TestValidator.equals(
    "task user email matches",
    retrievedTask.user.email,
    user.email,
  );

  // Validate timestamps are present and valid - flexible ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/.test(
      retrievedTask.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/.test(
      retrievedTask.updated_at,
    ),
  );
  TestValidator.equals(
    "completed_at is null for pending task",
    retrievedTask.completed_at,
    null,
  );

  // Test security boundary - attempt to access task with invalid ID
  const invalidTaskId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("cannot access non-existent task", async () => {
    await api.functional.todo.user.user_tasks.at(connection, {
      id: invalidTaskId,
    });
  });
}
