import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieval_after_task_creation(
  connection: api.IConnection,
) {
  const userEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const userCreateData = {
    email: userEmail,
    name: RandomGenerator.name(),
    password: "password123",
  } satisfies ITodoListUser.ICreate;
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userCreateData },
  );
  typia.assert(user);
  const taskCreateData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
  } satisfies ITodoListTask.ICreate;
  const task: ITodoListTask = await api.functional.todoList.user.tasks.create(
    connection,
    { body: taskCreateData },
  );
  typia.assert(task);
  const retrievedUser: ITodoListUser =
    await api.functional.todoList.user.users.at(connection, {
      userId: user.id,
    });
  typia.assert(retrievedUser);
  TestValidator.equals("user ID matches", retrievedUser.id, user.id);
  TestValidator.equals("user email matches", retrievedUser.email, userEmail);
}
