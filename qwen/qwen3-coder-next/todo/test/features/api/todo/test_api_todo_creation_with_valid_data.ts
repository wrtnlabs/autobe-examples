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

export async function test_api_todo_creation_with_valid_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // 2. Create a new todo item
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 1 }),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      start_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 86400000).toISOString(), // 1 day later
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // 3. Validate the created todo structure
  TestValidator.predicate("has id", typeof (todo as any).id === "string");
  TestValidator.predicate(
    "has timestamps",
    typeof (todo as any).created_at === "string",
  );
  TestValidator.equals(
    "is completed is false",
    (todo as any).is_completed,
    false,
  );
}
