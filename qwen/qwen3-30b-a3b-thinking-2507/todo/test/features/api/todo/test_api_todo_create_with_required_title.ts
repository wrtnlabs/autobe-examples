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

export async function test_api_todo_create_with_required_title(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456789012",
    },
  });
  typia.assert(userAuthorized);
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
        }),
      },
    },
  );
  typia.assert(todo);
  TestValidator.equals("title matches input", todo.title, todo.title);
  TestValidator.equals(
    "status defaults to incomplete",
    todo.is_complete,
    false,
  );
  TestValidator.equals(
    "created timestamp exists",
    todo.created_at,
    todo.created_at,
  );
  TestValidator.equals(
    "updated timestamp exists",
    todo.updated_at,
    todo.updated_at,
  );
  TestValidator.equals("id exists", todo.id, todo.id);
}
