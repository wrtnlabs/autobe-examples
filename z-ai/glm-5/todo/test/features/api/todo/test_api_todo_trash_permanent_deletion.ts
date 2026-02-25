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

export async function test_api_todo_trash_permanent_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create a todo that will be permanently deleted
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Task to permanently delete",
        description: "This todo will be soft deleted then permanently deleted",
      },
    },
  );
  typia.assert(todo);
  // 3. Create edit history by updating the todo
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: todo.id,
      body: {
        title: "Updated task title before deletion",
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Soft delete the todo (move to trash)
  await api.functional.todoApp.user.todos.erase(userConnection, {
    todoId: todo.id,
  });
  // 5. Permanently delete the todo from trash
  await api.functional.todoApp.user.trash.erase(userConnection, {
    todoId: todo.id,
  });
  // 6. Verify: attempting to permanently delete again should return 404
  await TestValidator.error("permanent delete non-existent todo", async () => {
    await api.functional.todoApp.user.trash.erase(userConnection, {
      todoId: todo.id,
    });
  });
  // 7. Verify: attempting to permanently delete a non-existent UUID should return 404
  await TestValidator.error("permanent delete invalid todo", async () => {
    await api.functional.todoApp.user.trash.erase(userConnection, {
      todoId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
