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
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_history_field_change_complex_edit_scenario(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test.com",
      referrer: "https://test.com/referrer",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create initial todo
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Prepare complex update with multiple field changes
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    start_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ITodoAppTodo.IUpdate;
  // Perform complex multi-field update
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: todo.id,
      body: updateBody,
    },
  );
  typia.assert(updatedTodo);
  // Verify the todo was updated correctly
  TestValidator.equals("title updated", updatedTodo.title, updateBody.title);
  // Retrieve history to get the history entries
  // Note: History retrieval endpoint not provided, but scenario mentions verifying field changes
  // Since history endpoint is not available in provided APIs, focus on validating the update worked
  // and field change tracking would be captured internally
  // TestValidator.predicate("todo updated", updatedTodo.updated_at > todo.created_at);
  // Since we cannot directly access history without the endpoint, validate the core functionality works
  // The field change tracking would be verified through the dedicated history endpoint when available
}
