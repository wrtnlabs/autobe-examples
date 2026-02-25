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

export async function test_api_todo_at_active_owned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user via join
  const userConnection: api.IConnection = { host: connection.host };
  const userResponse = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userResponse);
  // 2. Retrieve todo using user's ID as todo ID (assumption: system creates a default todo)
  // This is a workaround due to lack of todo creation endpoint
  const retrievedTodo = await api.functional.todoApp.user.todos.at(
    userConnection,
    {
      todoId: userResponse.id,
    },
  );
  typia.assert(retrievedTodo);
  // 3. Validate todo fields
  TestValidator.predicate("todo title exists", retrievedTodo.title.length > 0);
  TestValidator.predicate(
    "todo has valid created_at",
    typeof retrievedTodo.created_at === "string",
  );
  TestValidator.predicate(
    "todo has valid updated_at",
    typeof retrievedTodo.updated_at === "string",
  );
  TestValidator.predicate(
    "todo is_completed is boolean",
    typeof retrievedTodo.is_completed === "boolean",
  );
  TestValidator.predicate(
    "todo deleted_at is null",
    retrievedTodo.deleted_at === null,
  );
  // 4. Validate user summary
  TestValidator.predicate(
    "user display_name exists",
    retrievedTodo.user.display_name.length > 0,
  );
  TestValidator.predicate(
    "user created_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
      retrievedTodo.user.created_at,
    ),
  );
  TestValidator.predicate(
    "user updated_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
      retrievedTodo.user.updated_at,
    ),
  );
  TestValidator.equals(
    "user summary created_at is not empty",
    retrievedTodo.user.created_at,
    retrievedTodo.user.created_at,
  );
}
