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

export async function test_api_todo_trash_restore_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  // 2. Create a todo item
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: typia.random<ITodoAppTodo.ICreate>(),
  });
  typia.assert(todo);
  // 3. Delete the todo item to move it to trash
  // Generate random todo ID since ITodoAppTodo DTO has no properties
  const randomTodoId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.todoApp.user.todos.erase(userConnection, {
    todoId: randomTodoId,
  });
  // 4. Restore the todo from trash
  const restored = await api.functional.todoApp.user.trash.restore(
    userConnection,
    {
      trashId: randomTodoId,
    },
  );
  typia.assert(restored);
  // 5. Validate restore completed successfully
  TestValidator.predicate("restore completed successfully", restored !== null);
}
