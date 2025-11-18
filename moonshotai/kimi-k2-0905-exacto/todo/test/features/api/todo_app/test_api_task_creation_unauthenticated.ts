import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task creation without proper authentication. Validates that the API
 * correctly rejects unauthenticated requests and returns appropriate error
 * responses. Ensures task creation is properly protected and requires valid
 * user authentication.
 */
export async function test_api_task_creation_unauthenticated(
  connection: api.IConnection,
) {
  // Step 1: Create an unauthenticated connection by clearing authentication headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 2: Generate valid task creation data
  const taskData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "pending",
    priority: RandomGenerator.pick(["none", "low", "medium", "high"] as const),
  } satisfies ITodoAppTask.ICreate;

  // Step 3: Attempt to create task without authentication - should fail
  await TestValidator.error(
    "task creation without authentication should fail",
    async () => {
      await api.functional.todoApp.user.tasks.create(unauthConnection, {
        body: taskData,
      });
    },
  );

  // Step 4: Verify that the API properly rejects the request
  // Additional verification: Ensure the task data itself is valid for comparison
  const taskDataPreview = typia.random<ITodoAppTask.ICreate>();

  TestValidator.predicate(
    "generated task data is valid",
    typia.is<ITodoAppTask.ICreate>(taskData) && taskData.status === "pending",
  );
}
