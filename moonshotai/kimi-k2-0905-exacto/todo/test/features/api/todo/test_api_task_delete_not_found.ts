import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_task_delete_not_found(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to establish authenticated context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Attempt to delete a non-existent task
  const nonExistentTaskId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should fail when deleting non-existent task",
    async () => {
      await api.functional.todo.user.users.tasks.erase(connection, {
        userId: user.id,
        taskId: nonExistentTaskId,
      });
    },
  );
}
