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

export async function test_api_todo_creation_with_title_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user through authorization
  const userConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const user = await authorize_user_join(userConnection, {
    body: {
      email,
      password,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // 2. Create a todo with only the required title field
  const title = RandomGenerator.paragraph({ sentences: 1 });
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: {
      title,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // 3. Validate the created todo
  TestValidator.equals("title matches", todo.title, title);
  TestValidator.equals("is_completed is false", todo.is_completed, false);
  // The todo's user property contains ISummary with display_name
  const todoUser = typia.assert<ITodoAppUser.ISummary>(todo.user);
  // Extract display_name from email as the most likely default behavior
  const expectedDisplayName =
    email
      .split("@")[0]
      .replace(/[^a-zA-Z]/g, "")
      .charAt(0)
      .toUpperCase() +
    email
      .split("@")[0]
      .replace(/[^a-zA-Z]/g, "")
      .slice(1)
      .toLowerCase();
  TestValidator.equals(
    "user display_name matches",
    todoUser.display_name,
    expectedDisplayName,
  );
  // 4. Validate that optional fields are undefined (not provided by client)
  TestValidator.equals("description is undefined", todo.description, undefined);
  TestValidator.equals("start_date is undefined", todo.start_date, undefined);
  TestValidator.equals("due_date is undefined", todo.due_date, undefined);
  TestValidator.equals("deleted_at is undefined", todo.deleted_at, undefined);
}
