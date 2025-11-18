import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_task_creation_valid(
  connection: api.IConnection,
) {
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      name: RandomGenerator.name(),
      password: "1234",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  const taskData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    priority: RandomGenerator.pick(["low", "medium", "high"] as const),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITodoListTask.ICreate;
  const task = await api.functional.todoList.user.tasks.create(connection, {
    body: taskData,
  });
  typia.assert(task);

  TestValidator.equals("task title matches", task, taskData.title);
}
