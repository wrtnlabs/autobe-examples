import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import type { ITodoAppTodoHistoryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryChange";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_history_privacy_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create first user account
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser);
  
  // Create todo for first user
  const firstUserTodoResponse = await api.functional.todoApp.user.todos.create(firstUserConnection);
  const firstUserTodo = typia.assert<ITodoAppTodo>(firstUserTodoResponse);
  
  // Edit todo to generate history for first user
  const firstUserTodoUpdate = await api.functional.todoApp.user.todos.update(
    firstUserConnection,
    {
      todoId: firstUserTodo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(firstUserTodoUpdate);
  
  // Create second user account
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(secondUser);
  
  // Create todo for second user
  const secondUserTodoResponse = await api.functional.todoApp.user.todos.create(secondUserConnection);
  const secondUserTodo = typia.assert<ITodoAppTodo>(secondUserTodoResponse);
  
  // Edit todo to generate history for second user
  const secondUserTodoUpdate = await api.functional.todoApp.user.todos.update(
    secondUserConnection,
    {
      todoId: secondUserTodo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(secondUserTodoUpdate);
  
  // Test privacy validation by attempting cross-user access
  await TestValidator.error(
    "second user cannot access first user's todo",
    async () => {
      await api.functional.todoApp.user.todos.update(secondUserConnection, {
        todoId: firstUserTodo.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
  
  await TestValidator.error(
    "first user cannot access second user's todo",
    async () => {
      await api.functional.todoApp.user.todos.update(firstUserConnection, {
        todoId: secondUserTodo.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
  
  // Validate that each user can access their own resources
  const firstUserOwnTodo = await api.functional.todoApp.user.todos.update(
    firstUserConnection,
    {
      todoId: firstUserTodo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(firstUserOwnTodo);
  
  const secondUserOwnTodo = await api.functional.todoApp.user.todos.update(
    secondUserConnection,
    {
      todoId: secondUserTodo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(secondUserOwnTodo);
}