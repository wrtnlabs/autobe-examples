import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import type { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
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

export async function test_api_todo_history_snapshot_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(),
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // 2. Create initial todo
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // 3. First edit - change title only
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Ensure timestamp difference
  const firstEdit = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(firstEdit);
  // 4. Second edit - set due date
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Ensure timestamp difference
  const dueDateTimestamp = new Date().toISOString();
  const secondEdit = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: todo.id,
      body: {
        due_date: dueDateTimestamp,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(secondEdit);
  // 5. Retrieve history entries
  const histories = await api.functional.todoApp.user.todos.histories.index(
    userConnection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at:desc",
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(histories);
  TestValidator.predicate(
    "has at least 2 history entries",
    histories.data.length >= 2,
  );
  // 6. Validate history tracking system
  TestValidator.equals(
    "history entries have correct todo reference",
    histories.data[0].todo.id,
    todo.id,
  );
  TestValidator.equals(
    "history entries have correct user reference",
    histories.data[0].user.id,
    user.id,
  );
  // 7. Test that edits are properly tracked in history
  TestValidator.predicate(
    "history entries are in chronological order",
    new Date(histories.data[0].created_at).getTime() >
      new Date(histories.data[1].created_at).getTime(),
  );
}
