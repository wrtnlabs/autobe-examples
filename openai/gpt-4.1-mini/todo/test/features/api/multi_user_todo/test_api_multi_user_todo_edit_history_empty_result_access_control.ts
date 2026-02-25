import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoEditHistory";
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

export async function test_api_multi_user_todo_edit_history_empty_result_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. User1 registration and authentication
  const user1Connection: api.IConnection = { host: connection.host };
  const user1JoinBody: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    displayName: typia.random<string>(),
    href: "http://localhost/join",
    referrer: "http://localhost/referrer",
    ip: null,
  };
  const user1Authorized = await authorize_user_join(user1Connection, {
    body: user1JoinBody,
  });
  typia.assert(user1Authorized);
  user1Connection.headers = {
    Authorization: `Bearer ${user1Authorized.token.access}`,
  };
  // 2. User1 creates a todo (no edits done, so edit history empty)
  const todoCreateBody: IMultiUserTodoTodo.ICreate = {
    title: RandomGenerator.name(),
    description: null,
    startDate: null,
    dueDate: null,
  };
  const todo1 = await generate_random_multi_user_todo_user_todos_create(
    user1Connection,
    { body: todoCreateBody },
  );
  typia.assert(todo1);
  // 3. User1 queries edit history of todo1 with pagination
  const todo1EditHistoriesRequest: IMultiUserTodoTodoEditHistory.IRequest = {
    page: 1,
    limit: 10,
    startDate: null,
    endDate: null,
    sortBy: "created_at",
    sortOrder: "desc",
    search: null,
  };
  const todo1EditHistories =
    await api.functional.multiUserTodo.user.todos.editHistories.index(
      user1Connection,
      {
        todoId: todo1.id,
        body: todo1EditHistoriesRequest,
      },
    );
  typia.assert(todo1EditHistories);
  // Validate that edit history list is empty and pagination shows zero records
  TestValidator.equals(
    "User1 todo1 editHistories records length",
    todo1EditHistories.data.length,
    0,
  );
  TestValidator.equals(
    "User1 todo1 editHistories pagination records",
    todo1EditHistories.pagination.records,
    0,
  );
  TestValidator.equals(
    "User1 todo1 editHistories pagination pages",
    todo1EditHistories.pagination.pages,
    0,
  );
  TestValidator.equals(
    "User1 todo1 editHistories pagination current page",
    todo1EditHistories.pagination.current,
    1,
  );
  TestValidator.equals(
    "User1 todo1 editHistories pagination limit",
    todo1EditHistories.pagination.limit,
    10,
  );
  // 4. User2 registration and authentication
  const user2Connection: api.IConnection = { host: connection.host };
  const user2JoinBody: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    displayName: typia.random<string>(),
    href: "http://localhost/join",
    referrer: "http://localhost/referrer",
    ip: null,
  };
  const user2Authorized = await authorize_user_join(user2Connection, {
    body: user2JoinBody,
  });
  typia.assert(user2Authorized);
  user2Connection.headers = {
    Authorization: `Bearer ${user2Authorized.token.access}`,
  };
  // 5. User2 creates a todo
  const todo2 = await generate_random_multi_user_todo_user_todos_create(
    user2Connection,
    {},
  );
  typia.assert(todo2);
  // 6. User2 attempts to query edit history of User1's todo1 - should be an error
  await TestValidator.error(
    "User2 unauthorized access to User1's todo1 editHistories",
    async () => {
      await api.functional.multiUserTodo.user.todos.editHistories.index(
        user2Connection,
        {
          todoId: todo1.id,
          body: todo1EditHistoriesRequest,
        },
      );
    },
  );
}
