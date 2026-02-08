import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_multi_user_todo_user_todos_create } from "../../../generate/generate_random_multi_user_todo_user_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_multi_user_todo_todo_edit_history_access_denied_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. User A - Join and authenticate
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuthorized = await authorize_user_join(userAConnection, {
    body: {},
  });
  userAConnection.headers = {
    ...userAConnection.headers,
    Authorization: userAAuthorized.token.access,
  };
  // 2. User A - Create a todo (return type has no id to extract)
  await generate_random_multi_user_todo_user_todos_create(userAConnection, {});
  // 3. User B - Join and authenticate
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuthorized = await authorize_user_join(userBConnection, {
    body: {},
  });
  userBConnection.headers = {
    ...userBConnection.headers,
    Authorization: userBAuthorized.token.access,
  };
  // 4. User B tries to access User A's todo edit history with random UUIDs
  const randomTodoId = typia.random<string & tags.Format<"uuid">>();
  const randomEditHistoryId = typia.random<string & tags.Format<"uuid">>();
  // 5. Expect access denied error (403 or 404) when user B tries to access user A's todo edit history
  await TestValidator.httpError(
    "access denied to non-owner edit history",
    [403, 404],
    async () => {
      await api.functional.multiUserTodo.user.todos.editHistories.atEditHistory(
        userBConnection,
        {
          todoId: randomTodoId,
          editHistoryId: randomEditHistoryId,
        },
      );
    },
  );
}
