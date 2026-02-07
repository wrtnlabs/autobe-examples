import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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

export async function test_api_todo_edit_history_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new user account
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ITodoAppUser.IJoin,
  });
  // 2. Create new todo item
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // 3. Retrieve edit history for new todo (should be empty)
  const history = await api.functional.todoApp.user.todos.history.at(
    userConnection,
    {
      todoId: (todo as any).id,
    },
  );
  typia.assert(history);
  // 4. Validate empty history response
  TestValidator.equals("history data is empty", history.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    history.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", history.pagination.pages, 0);
  TestValidator.equals(
    "pagination current is 0",
    history.pagination.current,
    0,
  );
  TestValidator.equals("pagination limit is 0", history.pagination.limit, 0);
}
