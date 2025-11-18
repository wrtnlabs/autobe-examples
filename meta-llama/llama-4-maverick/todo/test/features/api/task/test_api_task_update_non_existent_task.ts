import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating a non-existent task as an authenticated user.
 *
 * This test ensures that the appropriate error response is returned when
 * attempting to update a task that does not exist.
 */
export async function test_api_task_update_non_existent_task(
  connection: api.IConnection,
) {
  // Create a new user account to authenticate the request
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        name: RandomGenerator.name(),
        password: "P@ssw0rd",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Generate a non-existent task ID
  const nonExistentTaskId = typia.random<string & tags.Format<"uuid">>();
  const updateData: ITodoListTask.IUpdate = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    dueDate: new Date().toISOString(),
  };

  // Attempt to update the non-existent task
  await TestValidator.httpError(
    "Updating non-existent task should return 404 error",
    404,
    async () =>
      await api.functional.todoList.user.tasks.update(connection, {
        taskId: nonExistentTaskId,
        body: updateData satisfies ITodoListTask.IUpdate,
      }),
  );
}
