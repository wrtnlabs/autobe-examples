import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
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

export async function test_apiodo_history_access_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create first user and todo setup
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser);
  // Create first user's todo and generate history
  const firstTodo = await api.functional.todoApp.user.todos.create(
    firstUserConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(firstTodo);
  // Update todo to generate history
  await api.functional.todoApp.user.todos.update(firstUserConnection, {
    todoId: firstTodo.id,
    body: {
      title: "Updated " + RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies ITodoAppTodo.IUpdate,
  });
  // Create second user
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(secondUser);
  // Create second user's todo
  const secondTodo = await api.functional.todoApp.user.todos.create(
    secondUserConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(secondTodo);
  // Test 1: First user should be able to access own todo history
  const firstUserHistory =
    await api.functional.todoApp.user.todos.history.index(firstUserConnection, {
      todoId: firstTodo.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoHistory.IRequest,
    });
  typia.assert(firstUserHistory);
  // Test 2: Second user should be able to access own todo history
  const secondUserHistory =
    await api.functional.todoApp.user.todos.history.index(
      secondUserConnection,
      {
        todoId: secondTodo.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoHistory.IRequest,
      },
    );
  typia.assert(secondUserHistory);
  // Test 3: Second user should NOT be able to access first user's todo history
  await TestValidator.error(
    "second user cannot access first user's todo history",
    async () => {
      await api.functional.todoApp.user.todos.history.index(
        secondUserConnection,
        {
          todoId: firstTodo.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies ITodoAppTodoHistory.IRequest,
        },
      );
    },
  );
  // Test 4: First user should NOT be able to access second user's todo history
  await TestValidator.error(
    "first user cannot access second user's todo history",
    async () => {
      await api.functional.todoApp.user.todos.history.index(
        firstUserConnection,
        {
          todoId: secondTodo.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies ITodoAppTodoHistory.IRequest,
        },
      );
    },
  );
  // Test 5: Invalid todo ID should result in appropriate error
  await TestValidator.error(
    "invalid todo ID should result in error",
    async () => {
      await api.functional.todoApp.user.todos.history.index(
        firstUserConnection,
        {
          todoId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies ITodoAppTodoHistory.IRequest,
        },
      );
    },
  );
  // Validate history entries belong to correct users
  TestValidator.predicate(
    "first user history entries belong to first user",
    firstUserHistory.data.every((entry) => entry.user.id === firstUser.id),
  );
  TestValidator.predicate(
    "second user history entries belong to second user",
    secondUserHistory.data.every((entry) => entry.user.id === secondUser.id),
  );
}
