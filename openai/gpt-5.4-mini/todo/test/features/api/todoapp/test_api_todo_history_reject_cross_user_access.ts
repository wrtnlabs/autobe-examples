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

export async function test_api_todo_history_reject_cross_user_access(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberA = await api.functional.todoApp.auth.member.join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(memberA);
  const memberB = await api.functional.todoApp.auth.member.join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(memberB);
  const foreignTodoId = typia.random<string & tags.Format<"uuid">>();
  const foreignHistoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "cross-user history access should be rejected",
    [401, 403, 404],
    async () => {
      await api.functional.todoApp.member.todos.histories.at(
        memberBConnection,
        {
          todoId: foreignTodoId,
          historyId: foreignHistoryId,
        },
      );
    },
  );
}
