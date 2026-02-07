import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoHistory";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_user_todos_create } from "../../../generate/generate_random_todo_user_todos_create";
import { prepare_random_todo_todo } from "../../../prepare/prepare_random_todo_todo";

export async function test_api_todo_history_get_title_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user using utility function
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      // User registration requires valid user data (email, password)
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies ITodoUser.IJoin,
  });
  // 2. Create a todo item with placeholder title
  const placeholderTitle = RandomGenerator.paragraph({ sentences: 1 });
  const initialTodo = await api.functional.todo.user.todos.create(
    userConnection,
    {
      body: {
        title: placeholderTitle,
      } satisfies ITodoTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  // 3. Edit the todo title to create history entry
  const newTitle = RandomGenerator.paragraph({ sentences: 1 });
  await api.functional.todo.user.todos.create(userConnection, {
    body: {
      title: newTitle,
    } satisfies ITodoTodo.ICreate,
  });
  // 4. Get history entry for the todo item
  const historyId = typia.random<string & tags.Format<"uuid">>();
  const history = await api.functional.todo.user.todos.histories.at(
    userConnection,
    {
      todoId: initialTodo.id,
      historyId: historyId,
    },
  );
  typia.assert(history);
  // 5. Validate history entry shows previous title, new title, and ISO 8601 timestamps
  TestValidator.equals(
    "previous title matches",
    history.prev_title,
    placeholderTitle,
  );
  TestValidator.equals("new title matches", history.new_title, newTitle);
  TestValidator.predicate(
    "created_at is ISO 8601 format",
    isIsoDateString(history.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 format",
    isIsoDateString(history.updated_at),
  );
}
function isIsoDateString(date: string): boolean {
  return /^d{4}-d{2}-d{2}Td{2}:d{2}:d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(
    date,
  );
}
