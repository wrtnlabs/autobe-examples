import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrincipal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrincipal";
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
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_edit_history_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two separate user connections
  const user1Connection: api.IConnection = { host: connection.host };
  const user2Connection: api.IConnection = { host: connection.host };
  // 2. First user registers using utility function
  const user1Info = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user1Info);
  // 3. Second user registers using utility function
  const user2Info = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user2Info);
  // 4. First user creates a todo item
  const todo = await api.functional.todoApp.user.todos.create(user1Connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // 5. Second user attempts to access first user's todo edit history
  // Expected: 404 Not Found (not 403 Forbidden) to prevent user enumeration
  await TestValidator.httpError(
    "second user cannot access first user's todo edit history",
    404,
    async () => {
      await api.functional.todoApp.user.todos.history(user2Connection, {
        todoId: todo.id,
      });
    },
  );
  // 6. Verify no edit history data is leaked
  // Since the request returned 404, no history data should be accessible
}
