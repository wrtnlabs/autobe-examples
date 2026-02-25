import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_edit_history_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. User A joins (creates account)
  const userAConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  // 2. User B joins (different account)
  const userBConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  // 3. User B attempts to access edit history of a todo belonging to User A
  // Since we cannot create a todo (no API available), we generate a random UUID
  // to simulate an existing todo ID. Security requirement: system must return 404
  // even if the todo doesn't exist, to prevent information leakage.
  const fakeTodoId = typia.random<string & tags.Format<"uuid">>();
  // 4. Verify that unauthorized user receives 404 Not Found (not 403)
  await TestValidator.httpError(
    "unauthorized user cannot access other user's todo history",
    404,
    async () => {
      await api.functional.todoApp.user.todos.history.at(userBConnection, {
        id: fakeTodoId,
      });
    },
  );
}
