import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_task_creation_with_valid_data(
  connection: api.IConnection,
) {
  // Step 1: User registration
  const userData = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "validPassword123",
  } satisfies ITodoListUser.ICreate;
  const user = await api.functional.auth.user.join(connection, {
    body: userData,
  });
  typia.assert(user);
  typia.assertGuard(user.token.access!);

  // Step 2: Create new task with valid data
  const tomorrow = new Date(Date.now() + 86400000);
  const taskData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    dueDate: tomorrow.toISOString().split("T")[0],
    priority: RandomGenerator.pick(["low", "medium", "high"] as const),
  } satisfies ITodoListTask.ICreate;
  const task = await api.functional.todoList.user.tasks.create(connection, {
    body: taskData,
  });
  typia.assert(task);

  // Step 3: Validate created task data
  TestValidator.predicate("created task ID is not empty", task.length > 0);
}
