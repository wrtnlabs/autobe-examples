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

export async function test_api_todo_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user account and get authenticated connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedUser);
  // Step 2: Create todo with valid title
  const todoTitle = RandomGenerator.paragraph({ sentences: 2 });
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: {
      title: todoTitle,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // Step 3: Validate todo properties
  TestValidator.equals("todo title matches input", todo.title, todoTitle);
  TestValidator.predicate("todo has valid UUID id", (): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todo.id,
    );
  });
  TestValidator.predicate("todo has creation timestamp", (): boolean => {
    return new Date(todo.created_at).getTime() > 0;
  });
  TestValidator.predicate("todo has update timestamp", (): boolean => {
    return new Date(todo.updated_at).getTime() > 0;
  });
  TestValidator.equals(
    "todo not deleted (deleted_at is null)",
    todo.deleted_at,
    null,
  );
  TestValidator.equals(
    "todo initially incomplete",
    todo.completion_status,
    false,
  );
  // Step 4: Verify user ownership
  TestValidator.equals(
    "todo belongs to authenticated user",
    todo.user.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "todo user email matches",
    todo.user.email,
    authorizedUser.email,
  );
  TestValidator.equals(
    "todo user display name matches",
    todo.user.display_name,
    authorizedUser.display_name,
  );
}
