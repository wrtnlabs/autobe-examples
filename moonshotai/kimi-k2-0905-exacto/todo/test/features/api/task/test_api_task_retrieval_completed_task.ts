import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test retrieval of tasks in different completion states.
 *
 * This test validates that users can successfully retrieve both pending and
 * completed tasks, verifying that the completed_at timestamp is properly
 * returned for finished tasks while remaining null for pending ones. The test
 * ensures the system correctly represents task lifecycle states in the response
 * data.
 *
 * Test workflow:
 *
 * 1. Create a user account for authentication via POST /auth/user/join
 * 2. Create a pending task with status="pending" and completed_at=null via POST
 *    /todoApp/user/tasks
 * 3. Create an additional task that will be marked as completed via POST
 *    /todoApp/user/tasks
 * 4. Retrieve both tasks via GET /todoApp/user/tasks/{taskId} and verify their
 *    completion states
 * 5. Validate that pending tasks have completed_at=null
 * 6. Validate that completed tasks have a valid completed_at timestamp
 */
export async function test_api_task_retrieval_completed_task(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create a pending task
  const pendingTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: {
          type: "full",
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ITodoAppTaskDescription.IFull,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(pendingTask);

  // Verify pending task has correct initial state
  TestValidator.equals("pending task status", pendingTask.status, "pending");
  TestValidator.equals(
    "pending task completed_at is null",
    pendingTask.completed_at,
    null,
  );

  // Step 3: Create an additional task
  const additionalTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: {
          type: "full",
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ITodoAppTaskDescription.IFull,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(additionalTask);

  // Step 4: Retrieve both tasks and verify states
  const retrievedPendingTask = await api.functional.todoApp.user.tasks.at(
    connection,
    {
      taskId: pendingTask.id,
    },
  );
  typia.assert(retrievedPendingTask);

  const retrievedAdditionalTask = await api.functional.todoApp.user.tasks.at(
    connection,
    {
      taskId: additionalTask.id,
    },
  );
  typia.assert(retrievedAdditionalTask);

  // Step 5: Validate pending task properties
  TestValidator.equals(
    "retrieved pending task has same ID",
    retrievedPendingTask.id,
    pendingTask.id,
  );
  TestValidator.equals(
    "retrieved pending task has same title",
    retrievedPendingTask.title,
    pendingTask.title,
  );
  TestValidator.equals(
    "retrieved pending task status is pending",
    retrievedPendingTask.status,
    "pending",
  );
  TestValidator.equals(
    "retrieved pending task completed_at is null",
    retrievedPendingTask.completed_at,
    null,
  );
  TestValidator.equals(
    "retrieved pending task has user context",
    retrievedPendingTask.user.id,
    user.id,
  );
  TestValidator.equals(
    "retrieved pending task has user email",
    retrievedPendingTask.user.email,
    userEmail,
  );

  // Step 6: Validate additional task properties
  TestValidator.equals(
    "retrieved additional task has same ID",
    retrievedAdditionalTask.id,
    additionalTask.id,
  );
  TestValidator.equals(
    "retrieved additional task has same title",
    retrievedAdditionalTask.title,
    additionalTask.title,
  );
  TestValidator.equals(
    "retrieved additional task status is pending",
    retrievedAdditionalTask.status,
    "pending",
  );
  TestValidator.equals(
    "retrieved additional task completed_at is null",
    retrievedAdditionalTask.completed_at,
    null,
  );
  TestValidator.equals(
    "retrieved additional task has user context",
    retrievedAdditionalTask.user.id,
    user.id,
  );
  TestValidator.equals(
    "retrieved additional task has user email",
    retrievedAdditionalTask.user.email,
    userEmail,
  );

  // Verify task timestamps are present and valid
  TestValidator.predicate(
    "pending task has created_at timestamp",
    retrievedPendingTask.created_at !== null,
  );
  TestValidator.predicate(
    "additional task has created_at timestamp",
    retrievedAdditionalTask.created_at !== null,
  );
  TestValidator.predicate(
    "pending task has updated_at timestamp",
    retrievedPendingTask.updated_at !== null,
  );
  TestValidator.predicate(
    "additional task has updated_at timestamp",
    retrievedAdditionalTask.updated_at !== null,
  );
}
