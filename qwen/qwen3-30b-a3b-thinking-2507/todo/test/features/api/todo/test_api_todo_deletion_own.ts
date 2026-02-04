import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { prepare_random_todo_todo } from "../../../prepare/prepare_random_todo_todo";
import { generate_random_todo_user_todos_create } from "../../../generate/generate_random_todo_user_todos_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_deletion_own(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user context for testing
  const userConnection: api.IConnection = { host: connection.host };
  const user: ITodoUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testpass123",
      } satisfies ITodoUser.IJoin,
    },
  );
  typia.assert(user);
  // Create a todo item to delete
  const todo: ITodoTodo = await generate_random_todo_user_todos_create(
    userConnection,
    {}, // Fixed to include empty props object
  );
  typia.assert(todo);
  // Delete the todo item (soft delete)
  await api.functional.todo.user.todos.erase(userConnection, {
    todoId: todo.id,
  });
}
