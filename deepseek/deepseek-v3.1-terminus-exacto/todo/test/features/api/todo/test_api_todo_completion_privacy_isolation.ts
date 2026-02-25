import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoCompletion";
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

export async function test_api_todo_completion_privacy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Setup first user
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Auth = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user1Auth);
  // Set authorization header for user1
  user1Connection.headers = {
    ...user1Connection.headers,
    Authorization: user1Auth.token.access,
  };
  // Create todo for first user
  const todo1 = await generate_random_todo_app_user_todos_create(
    user1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  // Setup second user
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Auth = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user2Auth);
  // Set authorization header for user2
  user2Connection.headers = {
    ...user2Connection.headers,
    Authorization: user2Auth.token.access,
  };
  // Attempt to access first user's todo completion using second user's connection
  await TestValidator.error(
    "cross-user completion access should fail",
    async () => {
      await api.functional.todoApp.user.todos.completion.current(
        user2Connection,
        {
          todoId: todo1.id,
        },
      );
    },
  );
  // Validate second user can access their own todos normally
  const todo2 = await generate_random_todo_app_user_todos_create(
    user2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  const completion2 =
    await api.functional.todoApp.user.todos.completion.current(
      user2Connection,
      {
        todoId: todo2.id,
      },
    );
  typia.assert(completion2);
  // Validate first user can still access their own todo completion
  const completion1 =
    await api.functional.todoApp.user.todos.completion.current(
      user1Connection,
      {
        todoId: todo1.id,
      },
    );
  typia.assert(completion1);
}
