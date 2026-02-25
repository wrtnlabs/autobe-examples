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

export async function test_api_todo_creation_with_start_date_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // 2. Create todo with only start date
  const title = RandomGenerator.paragraph({ sentences: 1 });
  const startDate = new Date().toISOString();
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: {
      title,
      startDate,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // 3. Validate created todo
  TestValidator.equals("title matches", todo.title, title);
  TestValidator.equals("startDate matches", todo.start_date, startDate);
  TestValidator.equals("dueDate is null", todo.due_date, null);
  TestValidator.equals("isComplete is false", todo.is_complete, false);
  TestValidator.equals("isDeleted is false", todo.is_deleted, false);
  TestValidator.predicate("has valid ID", /^[0-9a-f-]{36}$/i.test(todo.id));
  TestValidator.predicate("has valid createdAt", todo.created_at !== undefined);
  TestValidator.predicate("has valid updatedAt", todo.updated_at !== undefined);
  TestValidator.equals("user matches", todo.user.id, user.id);
}
