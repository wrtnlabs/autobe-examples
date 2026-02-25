import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrincipal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrincipal";
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

export async function test_api_todo_creation_with_title_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(user);
  // 2. Create todo with title only (no description, no dates)
  const body = {
    title: RandomGenerator.name(),
  } satisfies ITodoAppTodo.ICreate;
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body,
  });
  typia.assert(todo);
  // 3. Validate created todo
  TestValidator.equals("title matches", todo.title, body.title);
  TestValidator.equals("description is null", todo.description, null);
  TestValidator.equals("start_date is null", todo.start_date, null);
  TestValidator.equals("due_date is null", todo.due_date, null);
  TestValidator.equals("is_complete is false", todo.is_complete, false);
  TestValidator.equals("is_deleted is false", todo.is_deleted, false);
  TestValidator.predicate("created_at exists", todo.created_at !== undefined);
  TestValidator.predicate("updated_at exists", todo.updated_at !== undefined);
  TestValidator.predicate("has valid user", todo.user.id !== undefined);
  TestValidator.predicate(
    "has display name",
    todo.user.displayName !== undefined,
  );
}
