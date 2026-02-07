import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and login
  const userConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const registeredUser = await api.functional.todoApp.auth.user.join(
    userConnection,
    {
      body: {
        email,
        password: "password123",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(registeredUser);
  // 2. User login to get authentication token
  const loggedinUser = await api.functional.todoApp.auth.user.login(
    userConnection,
    {
      body: {
        email,
        password: "password123",
      } satisfies ITodoAppUser.ILogin,
    },
  );
  typia.assert(loggedinUser);
  // 3. Create a new connection with authentication token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${loggedinUser.token.access}`,
    },
  };
  // 4. Retrieve paginated todo list
  const todoList = await api.functional.todoApp.user.todos.index(
    authenticatedConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(todoList);
  // 5. Validate pagination structure
  TestValidator.equals("has pagination object", todoList.pagination, {
    current: 1,
    limit: 20,
    records: todoList.data.length,
    pages: todoList.data.length > 0 ? 1 : 0,
  });
  // 6. Validate data structure
  for (const todo of todoList.data) {
    typia.assert(todo);
  }
}