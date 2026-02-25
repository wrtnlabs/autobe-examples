import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistorySnapshotItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistorySnapshotItem";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
import type { ITodoAppTodoHistorySnapshotItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshotItem";
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

export async function test_api_todo_history_snapshots_privacy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create first user and authenticate
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      display_name: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user1);
  // Create first todo and edit to generate history
  const todo1 = await generate_random_todo_app_user_todos_create(
    user1Connection,
    {
      body: {
        title: typia.random<string>(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  // Edit todo to create history
  const todo1Update = await api.functional.todoApp.user.todos.update(
    user1Connection,
    {
      todoId: todo1.id,
      body: {
        title: typia.random<string>(),
        description: typia.random<string>(),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(todo1Update);
  // Create second user and authenticate
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      display_name: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user2);
  // Create second todo and edit to generate history
  const todo2 = await generate_random_todo_app_user_todos_create(
    user2Connection,
    {
      body: {
        title: typia.random<string>(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  // Edit second todo to create history
  const todo2Update = await api.functional.todoApp.user.todos.update(
    user2Connection,
    {
      todoId: todo2.id,
      body: {
        title: typia.random<string>(),
        description: typia.random<string>(),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(todo2Update);
  // Test 1: User1 cannot access User2's todo history
  await TestValidator.error(
    "User1 cannot access User2's todo history",
    async () => {
      await api.functional.todoApp.user.todos.history.snapshots.index(
        user1Connection,
        {
          todoId: todo2.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
        },
      );
    },
  );
  // Test 2: User2 cannot access User1's todo history
  await TestValidator.error(
    "User2 cannot access User1's todo history",
    async () => {
      await api.functional.todoApp.user.todos.history.snapshots.index(
        user2Connection,
        {
          todoId: todo1.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
        },
      );
    },
  );
  // Test 3: User1 can access own todo history
  const user1History =
    await api.functional.todoApp.user.todos.history.snapshots.index(
      user1Connection,
      {
        todoId: todo1.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
      },
    );
  typia.assert(user1History);
  TestValidator.predicate(
    "User1 history should contain some snapshots",
    user1History.data.length > 0,
  );
  // Test 4: User2 can access own todo history
  const user2History =
    await api.functional.todoApp.user.todos.history.snapshots.index(
      user2Connection,
      {
        todoId: todo2.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
      },
    );
  typia.assert(user2History);
  TestValidator.predicate(
    "User2 history should contain some snapshots",
    user2History.data.length > 0,
  );
  // Test 5: Non-existent todo ID should error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Non-existent todo ID should error", async () => {
    await api.functional.todoApp.user.todos.history.snapshots.index(
      user1Connection,
      {
        todoId: nonExistentId,
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
      },
    );
  });
}
