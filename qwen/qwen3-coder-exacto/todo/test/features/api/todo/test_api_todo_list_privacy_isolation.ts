import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { generate_random_todo_app_todo_user_todos_create } from "../../../generate/generate_random_todo_app_todo_user_todos_create";
import { authorize_todo_user_join } from "../../../authorize/authorize_todo_user_join";
import { authorize_todo_user_login } from "../../../authorize/authorize_todo_user_login";
import { authorize_todo_user_refresh } from "../../../authorize/authorize_todo_user_refresh";
export async function test_api_todo_list_privacy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first user for privacy testing
  const firstUser = await authorize_todo_user_join(connection, {
    body: {
      email: `first-${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Create connection for first user
  const firstUserConnection: api.IConnection = { host: connection.host };
  firstUserConnection.headers = {
    Authorization: `Bearer ${firstUser.token.access}`,
  };
  // Step 2: Create todos for first user
  const firstUserTodo = await generate_random_todo_app_todo_user_todos_create(
    firstUserConnection,
    {
      body: {
        title: "First user's todo",
        description: "This todo belongs to the first user",
      },
    },
  );
  // Step 3: Create second user for privacy testing
  const secondUser = await authorize_todo_user_join(connection, {
    body: {
      email: `second-${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Create connection for second user
  const secondUserConnection: api.IConnection = { host: connection.host };
  secondUserConnection.headers = {
    Authorization: `Bearer ${secondUser.token.access}`,
  };
  // Step 4: Create todos for second user
  const secondUserTodo = await generate_random_todo_app_todo_user_todos_create(
    secondUserConnection,
    {
      body: {
        title: "Second user's todo",
        description: "This todo belongs to the second user",
      },
    },
  );
  // Step 5: Verify first user can only see their own todos
  const firstUserTodos =
    await api.functional.todoApp.todoUser.todos.index(firstUserConnection);
  typia.assert(firstUserTodos);
  TestValidator.equals(
    "First user should only see their own todo",
    firstUserTodos.data.length,
    1,
  );
  TestValidator.equals(
    "First user should see their own todo",
    firstUserTodos.data[0].id,
    firstUserTodo.id,
  );
  // Step 6: Verify second user can only see their own todos
  const secondUserTodos =
    await api.functional.todoApp.todoUser.todos.index(secondUserConnection);
  typia.assert(secondUserTodos);
  TestValidator.equals(
    "Second user should only see their own todo",
    secondUserTodos.data.length,
    1,
  );
  TestValidator.equals(
    "Second user should see their own todo",
    secondUserTodos.data[0].id,
    secondUserTodo.id,
  );
  // Step 7: Additional verification - Check that neither user sees the other's todos
  const firstUserTodoIds = firstUserTodos.data.map((todo) => todo.id);
  const secondUserTodoIds = secondUserTodos.data.map((todo) => todo.id);
  TestValidator.equals(
    "First user should not see second user's todos",
    firstUserTodoIds.includes(secondUserTodo.id),
    false,
  );
  TestValidator.equals(
    "Second user should not see first user's todos",
    secondUserTodoIds.includes(firstUserTodo.id),
    false,
  );
}
