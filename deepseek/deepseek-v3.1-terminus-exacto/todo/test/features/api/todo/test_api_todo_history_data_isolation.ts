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

export async function test_api_todo_history_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create first user account
  const userConnectionA: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userConnectionA, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userA);
  // Create todo for first user
  const todoA = await generate_random_todo_app_user_todos_create(
    userConnectionA,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA);
  // User A should be able to access their own todo history
  const historyA = await api.functional.todoApp.user.todos.histories.index(
    userConnectionA,
    {
      todoId: todoA.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(historyA);
  // Create second user account
  const userConnectionB: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userConnectionB, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userB);
  // User B should NOT be able to access User A's todo history
  await TestValidator.error(
    "User B cannot access User A's todo history",
    async () => {
      await api.functional.todoApp.user.todos.histories.index(userConnectionB, {
        todoId: todoA.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoHistory.IRequest,
      });
    },
  );
  // Create todo for second user
  const todoB = await generate_random_todo_app_user_todos_create(
    userConnectionB,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoB);
  // User B should be able to access their own todo history
  const historyB = await api.functional.todoApp.user.todos.histories.index(
    userConnectionB,
    {
      todoId: todoB.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(historyB);
  // User A should NOT be able to access User B's todo history
  await TestValidator.error(
    "User A cannot access User B's todo history",
    async () => {
      await api.functional.todoApp.user.todos.histories.index(userConnectionA, {
        todoId: todoB.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoHistory.IRequest,
      });
    },
  );
  // Verify that users cannot access non-existent todo history
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "User A cannot access non-existent todo history",
    async () => {
      await api.functional.todoApp.user.todos.histories.index(userConnectionA, {
        todoId: nonExistentTodoId,
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoHistory.IRequest,
      });
    },
  );
}
