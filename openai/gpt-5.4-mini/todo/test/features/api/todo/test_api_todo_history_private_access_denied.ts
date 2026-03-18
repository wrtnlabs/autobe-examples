import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_todo_history_private_access_denied(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const intruderConnection: api.IConnection = { host: connection.host };
  const owner = await api.functional.todoApp.auth.member.join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(owner);
  const intruder = await api.functional.todoApp.auth.member.join(
    intruderConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(intruder);
  // No todo creation API is available in the provided SDK, so this test
  // validates that an authenticated member cannot use the history endpoint to
  // probe a todo UUID and learn whether another member's private todo exists.
  await TestValidator.httpError(
    "foreign todo history access should be denied",
    [401, 403, 404],
    async () => {
      await api.functional.todoApp.member.todos.histories.getByTodoid(
        intruderConnection,
        {
          todoId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
