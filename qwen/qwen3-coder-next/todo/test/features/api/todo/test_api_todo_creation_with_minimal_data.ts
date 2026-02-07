import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_creation_with_minimal_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new user account
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
  } satisfies ITodoAppUser.IJoin;
  const authorized = await authorize_user_join(userConnection, {
    body: userCredentials,
  });
  typia.assert(authorized);
  // 2. Create todo with minimal data (only required title)
  const minimalTodo = {
    title: RandomGenerator.name(),
  } satisfies ITodoAppTodo.ICreate;
  const createdTodo = await api.functional.todoApp.user.todos.create(
    userConnection,
    {
      body: minimalTodo,
    },
  );
  typia.assert(createdTodo);
  // 3. Validate minimal todo creation
  TestValidator.predicate("todo has id", typeof (createdTodo as any).id === "string");
  TestValidator.predicate(
    "todo has title",
    typeof (createdTodo as any).title === "string",
  );
  TestValidator.equals(
    "title matches input",
    (createdTodo as any).title,
    minimalTodo.title,
  );
}