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

export async function test_api_todo_toggle_complete(
  connection: api.IConnection,
) {
  // Validate toggle between incomplete and complete status for todo items.
  // User creates a todo as incomplete, then updates it to complete status.
  // Verify the response shows is_complete as true and updated_at timestamp refreshes.
  // 1. Auth user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create todo (incomplete)
  const initialTodo =
    await generate_random_todo_app_user_todos_create(userConnection, {});
  // 3. Toggle to complete
  const toggledTodo = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      id: initialTodo.id,
      body: {
        is_complete: true,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(toggledTodo);
  // 4. Validate
  TestValidator.equals("is_complete", toggledTodo.is_complete, true);
  TestValidator.notEquals(
    "updated_at",
    toggledTodo.updated_at,
    initialTodo.updated_at,
  );
}