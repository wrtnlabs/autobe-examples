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

export async function test_api_todo_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  // Generate todo with all optional fields
  const start_date = new Date().toISOString();
  const due_date = new Date(new Date().getTime() + 86400000).toISOString(); // 1 day after start_date
  const body: ITodoAppTodo.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    start_date,
    due_date,
  } satisfies ITodoAppTodo.ICreate;
  // Create todo
  const createdTodo = await api.functional.todoApp.user.todos.create(
    userConnection,
    {
      body,
    },
  );
  typia.assert(createdTodo);
  // Validate all fields match exactly
  TestValidator.equals("title matches", createdTodo.title, body.title);
  TestValidator.equals(
    "description matches",
    createdTodo.description,
    body.description,
  );
  TestValidator.equals(
    "start_date matches",
    createdTodo.start_date,
    body.start_date,
  );
  TestValidator.equals("due_date matches", createdTodo.due_date, body.due_date);
  TestValidator.predicate(
    "due_date is after start_date",
    new Date(createdTodo.due_date ?? "") > new Date(createdTodo.start_date ?? ""),
  );
  TestValidator.equals(
    "is_completed is false",
    createdTodo.is_completed,
    false,
  );
}