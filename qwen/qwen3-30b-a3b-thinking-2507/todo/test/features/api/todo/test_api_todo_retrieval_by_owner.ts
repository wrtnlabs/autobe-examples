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

export async function test_api_todo_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
      },
    },
  );
  // 2. Create todo
  const createdTodo: ITodoAppTodo =
    await generate_random_todo_app_user_todos_create(userConnection, {
      body: {},
    });
  typia.assert(createdTodo);
  // 3. Retrieve todo
  const retrievedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.at(userConnection, {
      id: createdTodo.id,
    });
  typia.assert(retrievedTodo);
  // 4. Validate
  TestValidator.equals(
    "todo belongs to user",
    retrievedTodo.user.id,
    userAuth.id,
  );
  TestValidator.equals("title matches", retrievedTodo.title, createdTodo.title);
  TestValidator.predicate(
    "completion status is incomplete",
    !retrievedTodo.is_complete,
  );
}
