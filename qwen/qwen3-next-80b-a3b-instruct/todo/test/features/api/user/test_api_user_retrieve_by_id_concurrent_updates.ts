import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_concurrent_updates(
  connection: api.IConnection,
) {
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "validPassword123",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  const task: ITodoListTask = await api.functional.todoList.user.tasks.create(
    connection,
    {
      body: {
        description: RandomGenerator.paragraph(),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  const fetchPromises = ArrayUtil.repeat(5, () =>
    api.functional.todoList.user.actors.at(connection, {
      userId: user.id,
    }),
  );
  const results = await Promise.all(fetchPromises);
  results.forEach((result) => {
    typia.assert(result);
    TestValidator.equals("user ID matches", result, user.id);
  });
}
