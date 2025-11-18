import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_with_duplicate_tasks(
  connection: api.IConnection,
) {
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  const taskDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  });

  const task1 = await api.functional.todoList.user.tasks.create(connection, {
    body: { description: taskDescription } satisfies ITodoListTask.ICreate,
  });
  typia.assert(task1);

  const task2 = await api.functional.todoList.user.tasks.create(connection, {
    body: { description: taskDescription } satisfies ITodoListTask.ICreate,
  });
  typia.assert(task2);

  // Verify tasks have different IDs but same description (idempotency)
  TestValidator.equals(
    "first task description matches",
    task1.description,
    taskDescription,
  );
  TestValidator.equals(
    "second task description matches",
    task2.description,
    taskDescription,
  );
  TestValidator.notEquals("tasks have different IDs", task1.id, task2.id);

  // Retrieve the user by ID
  const retrievedUser = await api.functional.todoList.user.actors.at(
    connection,
    { userId: user.id },
  );
  typia.assert(retrievedUser);

  // Verify retrieved user ID matches created user ID
  TestValidator.equals(
    "retrieved user ID matches created user ID",
    retrievedUser,
    user.id,
  );
}
