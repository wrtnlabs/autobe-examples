import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_task_update_unauthorized_user(
  connection: api.IConnection,
) {
  // Step 1: Create first user (task owner)
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: firstUserEmail,
        password: "password123",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(firstUser);

  // Step 2: Create task owned by first user
  const taskDescription = RandomGenerator.paragraph({ sentences: 5 });
  const createdTask: ITodoListTask =
    await api.functional.todoList.user.tasks.create(connection, {
      body: {
        description: taskDescription,
      } satisfies ITodoListTask.ICreate,
    });
  typia.assert(createdTask);

  // Step 3: Create second user (unauthorized updater) - switches context to second user
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  // No need to save secondUser object since we don't use it later
  await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "password123",
    } satisfies ITodoListUser.ICreate,
  }); // This switches the connection to second user context

  // Step 4: Attempt update of task owned by first user (should fail with 404)
  await TestValidator.error(
    "unauthorized user cannot update someone else's task",
    async () => {
      await api.functional.todoList.user.tasks.update(connection, {
        taskId: createdTask.id,
        body: "{}" satisfies ITodoListTask.IUpdate,
      });
    },
  );
}
