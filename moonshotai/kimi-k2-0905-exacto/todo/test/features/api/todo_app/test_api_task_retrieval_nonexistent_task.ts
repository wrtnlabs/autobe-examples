import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test the system's response when attempting to retrieve a non-existent task
 * ID. This scenario validates proper error handling for invalid task
 * identifiers, ensuring the system returns appropriate error responses with
 * clear messages when tasks are not found. The test also verifies that the
 * system handles format validation for task ID parameters correctly.
 *
 * Test Steps:
 *
 * 1. Establish user authentication context through account creation
 * 2. Attempt to retrieve a task using a non-existent UUID
 * 3. Validate that the system properly returns appropriate error handling
 * 4. Verify error response contains appropriate information for resource not found
 */
export async function test_api_task_retrieval_nonexistent_task(
  connection: api.IConnection,
) {
  // Create user account to establish proper authentication context
  // This is a prerequisite dependency before attempting task operations
  const userEmail = typia.random<string & tags.Format<"email">>();
  const authenticatedUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "SecurePassword123",
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authenticatedUser);

  // Generate a valid UUID that doesn't correspond to any actual task
  // This tests the system's handling of non-existent resource requests
  const nonExistentTaskId = typia.random<string & tags.Format<"uuid">>();

  // Verify that attempting to retrieve a non-existent task properly fails
  await TestValidator.error(
    "retrieving non-existent task should return error response",
    async () => {
      await api.functional.todoApp.user.tasks.at(connection, {
        taskId: nonExistentTaskId,
      });
    },
  );
}
