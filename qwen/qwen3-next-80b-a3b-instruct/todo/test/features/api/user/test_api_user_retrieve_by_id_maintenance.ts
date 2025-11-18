import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_maintenance(
  connection: api.IConnection,
) {
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword123!",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  const task: ITodoListTask = await api.functional.todoList.user.tasks.create(
    connection,
    {
      body: {
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // Execute user retrieval operation for maintenance mode testing
  const retrievedUser: ITodoListUser =
    await api.functional.todoList.user.actors.at(connection, {
      userId: user.id,
    });
  typia.assert(retrievedUser);
  TestValidator.equals("retrieved user ID matches", retrievedUser, user.id);
}
