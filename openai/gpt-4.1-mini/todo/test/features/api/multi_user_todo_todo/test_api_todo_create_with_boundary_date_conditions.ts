import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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

export async function test_api_todo_create_with_boundary_date_conditions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Sign up a new user
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody: IMultiUserTodoUser.IJoin = {
    email: `test-${RandomGenerator.alphabets(6)}@example.com` as string &
      tags.Format<"email">,
    password: "P@ssw0rd!", // simple fixed password string
    displayName: RandomGenerator.name(),
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
    ip: null,
  };
  const authorized = await authorize_user_join(userConnection, {
    body: joinBody,
  });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare boundary date condition where startDate equals dueDate
  const boundaryDate = new Date().toISOString();
  const todoCreateBody: IMultiUserTodoTodo.ICreate = {
    title: `Boundary test todo ${RandomGenerator.alphabets(4)}`,
    description:
      "Test todo with startDate equal to dueDate boundary condition.",
    startDate: boundaryDate,
    dueDate: boundaryDate,
  };
  // 3. Create todo with boundary date
  const todo = await generate_random_multi_user_todo_user_todos_create(
    userConnection,
    {
      body: todoCreateBody,
    },
  );
  // 4. Validate the response
  typia.assert(todo);
  TestValidator.equals("todo title matches", todo.title, todoCreateBody.title);
  TestValidator.equals(
    "todo description matches",
    todo.description,
    todoCreateBody.description,
  );
  TestValidator.equals(
    "todo startDate matches dueDate",
    todo.startDate,
    todo.dueDate,
  );
  TestValidator.equals(
    "todo startDate matches input",
    todo.startDate,
    todoCreateBody.startDate,
  );
  TestValidator.equals(
    "todo dueDate matches input",
    todo.dueDate,
    todoCreateBody.dueDate,
  );
  TestValidator.predicate(
    "todo completed default false",
    todo.completed === false,
  );
  TestValidator.equals("todo user id", todo.user.id, authorized.id);
}
