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

export async function test_api_todo_history_require_matching_parent_todo(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(joined);
  const todoId = typia.random<string & tags.Format<"uuid">>();
  const historyId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "missing todo or mismatched history should be rejected",
    [400, 401, 403, 404],
    async () => {
      await api.functional.todoApp.member.todos.histories.at(memberConnection, {
        todoId,
        historyId,
      });
    },
  );
  await TestValidator.httpError(
    "todo detail lookup should be protected",
    [400, 401, 403, 404],
    async () => {
      await api.functional.todoApp.member.todos.at(memberConnection, {
        todoId,
      });
    },
  );
}
