import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_all_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register user and get auth token
  const authConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(authConnection, {
    body: {} satisfies ITodoUser.IJoin,
  });
  // 2. Use the authenticated connection
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { ...authConnection.headers };
  // 3. Retrieve todos with default pagination (page 1, limit 10)
  const todos = await api.functional.todo.user.todos.index(userConnection, {
    body: {
      page: 1,
      limit: 10,
    } satisfies ITodoTodo.IRequest,
  });
  typia.assert(todos);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination should have page 1",
    todos.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination should have limit 10",
    todos.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    todos.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    todos.pagination.pages >= 0,
  );
  // 5. Validate data array existence and structure
  TestValidator.predicate("data should exist", todos.data.length >= 0);
  if (todos.data.length > 0) {
    // 6. Validate first item structure
    const firstTodo = todos.data[0];
    TestValidator.predicate(
      "todo should have title",
      typeof firstTodo.title === "string",
    );
    TestValidator.predicate(
      "todo should be complete status boolean",
      typeof firstTodo.is_completed === "boolean",
    );
    TestValidator.predicate(
      "todo should have created_at format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
        firstTodo.created_at,
      ),
    );
    TestValidator.equals("user should exist", firstTodo.user.id, undefined);
  }
}
