import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_todo_edit_multiple_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  // 2. Create a todo with initial values
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Prepare new values for editing
  const newTitle = RandomGenerator.name();
  const newDescription = RandomGenerator.paragraph({ sentences: 2 });
  const newStartDate = new Date(Date.now() + 172800000).toISOString();
  const newDueDate = new Date(Date.now() + 259200000).toISOString();
  // 4. Edit multiple fields simultaneously
  const historyEntry = await api.functional.todoApp.user.todos.histories.create(
    userConnection,
    {
      todoId: todo.id,
      body: typia.assert<ITodoAppTodo.IRequest>({
        title: newTitle,
        description: newDescription,
        start_date: newStartDate,
        due_date: newDueDate,
      }),
    },
  );
  typia.assert(historyEntry);
  // 5. Validate history entry
  TestValidator.equals(
    "todo_id matches",
    historyEntry.todo_app_todo_id,
    todo.id,
  );
  TestValidator.equals(
    "title before matches",
    historyEntry.before_title,
    todo.title,
  );
  TestValidator.equals(
    "title after matches",
    historyEntry.after_title,
    newTitle,
  );
  TestValidator.equals(
    "description before matches",
    historyEntry.before_description,
    todo.description,
  );
  TestValidator.equals(
    "description after matches",
    historyEntry.after_description,
    newDescription,
  );
  TestValidator.equals(
    "start_date before matches",
    historyEntry.before_startdate,
    todo.start_date,
  );
  TestValidator.equals(
    "start_date after matches",
    historyEntry.after_startdate,
    newStartDate,
  );
  TestValidator.equals(
    "due_date before matches",
    historyEntry.before_duedate,
    todo.due_date,
  );
  TestValidator.equals(
    "due_date after matches",
    historyEntry.after_duedate,
    newDueDate,
  );
}