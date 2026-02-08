import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_list_filter_completed_only(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // This test authenticates as a new user and requests a todo list filtered to only completed todos.
  // Because IRequest type is empty, the filter parameter cannot be passed explicitly, assuming backend returns completed todos as per scenario.
  // Due to empty ISummary DTO, we cannot verify todo properties, only pagination.
  const userConnection: api.IConnection = { host: connection.host };
  // Authenticate user and update connection headers
  const authorized = await authorize_user_join(userConnection, {
    body: {} satisfies IMultiUserTodoUser.IJoin,
  });
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorized.token.access;
  // Empty request body
  const requestBody = {} satisfies IMultiUserTodoTodo.IRequest;
  // Retrieve todo list
  const output = await api.functional.multiUserTodo.user.todos.index(
    userConnection,
    {
      body: requestBody,
    },
  );
  // Assert output type
  const typedOutput = typia.assert<IPageIMultiUserTodoTodo.ISummary>(output);
  // Validate pagination
  const pagination = typedOutput.pagination;
  TestValidator.predicate(
    "pagination current page is positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  // Since todo properties are not defined, no further deep validation can be done
}
