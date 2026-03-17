import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_history_access_control_and_error_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate User A
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuthorized = await authorize_member_join(userAConnection, {});
  typia.assert(userAAuthorized);
  // 2. Create and authenticate User B
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuthorized = await authorize_member_join(userBConnection, {});
  typia.assert(userBAuthorized);
  // 3. User A creates a todo
  const todo = await generate_random_todo_app_member_todos_create(
    userAConnection,
    {},
  );
  typia.assert(todo);
  // 4. Test successful history retrieval by owner (User A)
  const emptyHistories =
    await api.functional.todoApp.member.todos.histories.index(userAConnection, {
      todoId: todo.id,
      body: {},
    });
  typia.assert(emptyHistories);
  TestValidator.equals(
    "owner can retrieve empty history",
    emptyHistories.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be zero",
    emptyHistories.pagination.records,
    0,
  );
  // 5. Test access control: User B cannot access User A's todo history
  await TestValidator.error(
    "User B cannot access User A's todo history",
    async () => {
      await api.functional.todoApp.member.todos.histories.index(
        userBConnection,
        {
          todoId: todo.id,
          body: {},
        },
      );
    },
  );
  // 6. Test non-existent todo history retrieval (User A credentials)
  await TestValidator.error(
    "non-existent todo should return error",
    async () => {
      await api.functional.todoApp.member.todos.histories.index(
        userAConnection,
        {
          todoId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );
}
