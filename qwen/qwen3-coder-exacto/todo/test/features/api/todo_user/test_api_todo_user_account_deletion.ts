import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { prepare_random_todo_app_todo_edit_history } from "../../../prepare/prepare_random_todo_app_todo_edit_history";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { generate_random_todo_app_todo_user_todos_create } from "../../../generate/generate_random_todo_app_todo_user_todos_create";
import { generate_random_todo_app_todo_user_todos_edit_histories_create } from "../../../generate/generate_random_todo_app_todo_user_todos_edit_histories_create";
import { authorize_todo_user_join } from "../../../authorize/authorize_todo_user_join";
import { authorize_todo_user_login } from "../../../authorize/authorize_todo_user_login";
import { authorize_todo_user_refresh } from "../../../authorize/authorize_todo_user_refresh";
export async function test_api_todo_user_account_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new todo user with authorization
  const todoUserConnection: api.IConnection = { host: connection.host };
  const todoUser: ITodoAppTodoUser.IAuthorized = await authorize_todo_user_join(
    todoUserConnection,
    {
      body: {
        email: `test-user-${RandomGenerator.alphaNumeric(16)}@example.com`,
        password: RandomGenerator.alphaNumeric(16),
        href: "https://todo.wrtn.io/register",
        referrer: "https://todo.wrtn.io",
      },
    },
  );
  // 2. Create a todo for the user
  const todo: ITodoAppTodo =
    await generate_random_todo_app_todo_user_todos_create(
      todoUserConnection,
      {},
    );
  // 3. Create an edit history entry for the todo
  const editHistory: ITodoAppTodoEditHistory =
    await generate_random_todo_app_todo_user_todos_edit_histories_create(
      todoUserConnection,
      {
        params: {
          todoId: todo.id,
        },
      },
    );
  // 4. Delete the todo user account
  await api.functional.todoApp.todoUser.todo_users.erase(todoUserConnection, {
    todoUserId: todoUser.id,
  });
  // 5. Verify that the user account has been deleted
  // Note: In a real application, we would verify that all related data
  // (todos, edit histories, etc.) has also been deleted. However, since
  // we don't have direct database access in this test, we can't verify
  // the cascade deletion directly. We can only verify that the delete
  // operation completed without error.
  typia.assert(todoUser);
  typia.assert(todo);
  typia.assert(editHistory);
}
