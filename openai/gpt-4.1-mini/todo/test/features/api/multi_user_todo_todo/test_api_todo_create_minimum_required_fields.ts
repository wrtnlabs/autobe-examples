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

export async function test_api_todo_create_minimum_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup user join connection and register new user
  const userJoinConnection: api.IConnection = { host: connection.host };
  const newUser: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    displayName: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://example.com/",
    ip: null,
  };
  const authorizedUser = await authorize_user_join(userJoinConnection, {
    body: newUser,
  });
  typia.assert(authorizedUser);
  // 2. Create a new connection for the authorized user with token set
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // 3. Prepare minimal todo create body with only title
  const todoCreateBody: IMultiUserTodoTodo.ICreate = {
    title: RandomGenerator.name(1),
  };
  // 4. Create the todo by calling the utility function
  const createdTodo = await generate_random_multi_user_todo_user_todos_create(
    userConnection,
    {
      body: todoCreateBody,
    },
  );
  typia.assert(createdTodo);
  // 5. Validate that the created todo matches expectations
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoCreateBody.title,
  );
  TestValidator.equals(
    "todo is incomplete by default",
    createdTodo.completed,
    false,
  );
  TestValidator.predicate(
    "createdAt exists and valid",
    typeof createdTodo.createdAt === "string" &&
      createdTodo.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt exists and valid",
    typeof createdTodo.updatedAt === "string" &&
      createdTodo.updatedAt.length > 0,
  );
  TestValidator.equals("deletedAt is null", createdTodo.deletedAt, null);
  TestValidator.equals(
    "todo user id matches authorized user",
    createdTodo.user.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "todo user displayName matches authorized user",
    createdTodo.user.displayName,
    authorizedUser.displayName,
  );
}
