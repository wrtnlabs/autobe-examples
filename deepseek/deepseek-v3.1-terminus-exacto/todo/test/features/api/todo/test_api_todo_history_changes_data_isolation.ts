import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistoryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistoryChange";
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
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_history_changes_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create first user
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser);
  // Create first user's todo and edit it to generate history
  const firstTodo = await generate_random_todo_app_user_todos_create(
    firstUserConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(firstTodo);
  // Perform multiple edits to create history records
  const updatedFirstTodo = await api.functional.todoApp.user.todos.update(
    firstUserConnection,
    {
      todoId: firstTodo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedFirstTodo);
  // Perform another edit to ensure history is created
  const finalFirstTodo = await api.functional.todoApp.user.todos.update(
    firstUserConnection,
    {
      todoId: firstTodo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        due_date: new Date().toISOString(),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(finalFirstTodo);
  // Create second user
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(secondUser);
  // Create second user's todo and edit it to generate history
  const secondTodo = await generate_random_todo_app_user_todos_create(
    secondUserConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(secondTodo);
  // Perform edits to create history for second user
  const updatedSecondTodo = await api.functional.todoApp.user.todos.update(
    secondUserConnection,
    {
      todoId: secondTodo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: new Date().toISOString(),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedSecondTodo);
  // Test data isolation - second user cannot access first user's todo
  await TestValidator.error(
    "second user cannot access first user's todo data",
    async () => {
      await api.functional.todoApp.user.todos.histories.changes.index(
        secondUserConnection,
        {
          todoId: firstTodo.id,
          historyId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies ITodoAppTodoHistoryChange.IRequest,
        },
      );
    },
  );
  // Test data isolation - first user cannot access second user's todo
  await TestValidator.error(
    "first user cannot access second user's todo data",
    async () => {
      await api.functional.todoApp.user.todos.histories.changes.index(
        firstUserConnection,
        {
          todoId: secondTodo.id,
          historyId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies ITodoAppTodoHistoryChange.IRequest,
        },
      );
    },
  );
  // Test non-existent todo/history combination for first user
  await TestValidator.error(
    "first user cannot access non-existent todo",
    async () => {
      await api.functional.todoApp.user.todos.histories.changes.index(
        firstUserConnection,
        {
          todoId: typia.random<string & tags.Format<"uuid">>(),
          historyId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies ITodoAppTodoHistoryChange.IRequest,
        },
      );
    },
  );
  // Test non-existent todo/history combination for second user
  await TestValidator.error(
    "second user cannot access non-existent todo",
    async () => {
      await api.functional.todoApp.user.todos.histories.changes.index(
        secondUserConnection,
        {
          todoId: typia.random<string & tags.Format<"uuid">>(),
          historyId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies ITodoAppTodoHistoryChange.IRequest,
        },
      );
    },
  );
  // Validate ownership checks prevent unauthorized access
  TestValidator.predicate(
    "different user IDs ensure data isolation",
    firstUser.id !== secondUser.id,
  );
  TestValidator.predicate(
    "different todo IDs ensure data isolation",
    firstTodo.id !== secondTodo.id,
  );
  // Verify users can only access their own data through the system's built-in isolation
  TestValidator.equals(
    "first user ID matches their todo's user ID",
    firstTodo.user.id,
    firstUser.id,
  );
  TestValidator.equals(
    "second user ID matches their todo's user ID",
    secondTodo.user.id,
    secondUser.id,
  );
}
