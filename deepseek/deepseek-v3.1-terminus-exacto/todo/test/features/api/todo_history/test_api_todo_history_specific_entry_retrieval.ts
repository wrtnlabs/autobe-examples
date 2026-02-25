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

export async function test_api_todo_history_specific_entry_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Setup: create user connection via authorize_user_join utility
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(userAuth);
  // Create todo using generate_random_todo_app_user_todos_create utility
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: { title: RandomGenerator.paragraph() },
    },
  );
  typia.assert(todo);
  // Update todo to generate a history entry
  const updateBody = {
    title: RandomGenerator.paragraph(),
    description: RandomGenerator.paragraph(),
  } satisfies ITodoAppTodo.IUpdate;
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: todo.id,
      body: updateBody,
    },
  );
  typia.assert(updatedTodo);
  // Get paginated history list to obtain historyId
  const historyList = await api.functional.todoApp.user.todos.history.index(
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
  typia.assert(historyList);
  TestValidator.equals(
    "history list should have at least one entry",
    historyList.data.length >= 1,
    true,
  );
  const historyEntry = historyList.data[0];
  // Retrieve specific history entry
  const specificHistory = await api.functional.todoApp.user.todos.history.at(
    userConnection,
    {
      todoId: todo.id,
      historyId: historyEntry.id,
    },
  );
  typia.assert(specificHistory);
  // Validate history entry matches expected schema and references
  TestValidator.equals(
    "history id matches",
    specificHistory.id,
    historyEntry.id,
  );
  TestValidator.equals("todo id matches", specificHistory.todo.id, todo.id);
  TestValidator.equals("user id matches", specificHistory.user.id, userAuth.id);
  TestValidator.predicate(
    "history has valid timestamps",
    specificHistory.created_at &&
      specificHistory.updated_at &&
      specificHistory.deleted_at === null,
  );
  TestValidator.equals(
    "todo summary title matches",
    specificHistory.todo.title,
    todo.title,
  );
  TestValidator.equals(
    "user summary email matches",
    specificHistory.user.email,
    userAuth.email,
  );
}
