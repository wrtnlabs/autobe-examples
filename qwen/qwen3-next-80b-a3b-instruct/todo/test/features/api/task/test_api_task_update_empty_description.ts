import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_task_update_empty_description(
  connection: api.IConnection,
) {
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  const task = await api.functional.todoList.user.tasks.create(connection, {
    body: {
      description: "Initial task description",
    } satisfies ITodoListTask.ICreate,
  });
  typia.assert(task);

  await TestValidator.error(
    "empty description (only spaces) should fail validation",
    async () => {
      await api.functional.todoList.user.tasks.update(connection, {
        taskId: task.id,
        body: "   ",
      });
    },
  );
}
