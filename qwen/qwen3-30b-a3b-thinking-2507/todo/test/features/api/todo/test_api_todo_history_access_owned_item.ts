import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoHistory";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { prepare_random_todo_todo } from "../../../prepare/prepare_random_todo_todo";
import { generate_random_todo_user_todos_create } from "../../../generate/generate_random_todo_user_todos_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_history_access_owned_item(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user context
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  // Step 2: Create initial todo item
  const todo = await generate_random_todo_user_todos_create(userConnection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 1,
        wordMax: 50,
      }),
      description: RandomGenerator.content({ paragraphs: 1 }),
      start_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 86400000).toISOString(),
    } satisfies ITodoTodo.ICreate,
  });
  typia.assert(todo);
  // Step 3: Access the todo's history
  // The first history entry is automatically created
  const history = await api.functional.todo.user.todos.histories.at(
    userConnection,
    {
      todoId: todo.id,
      historyId: todo.id,
    },
  );
  typia.assert(history);
  // Step 4: Validate the history entry
  TestValidator.equals(
    "history createdAt should match todo createdAt",
    history.createdAt,
    todo.createdAt,
  );
  TestValidator.equals(
    "history titleBefore should equal initial title",
    history.titleBefore,
    todo.title,
  );
  TestValidator.equals(
    "history descriptionBefore should equal initial description",
    history.descriptionBefore,
    todo.description,
  );
  TestValidator.equals(
    "history startDateBefore should match start_date",
    history.startDateBefore,
    todo.startDate,
  );
  TestValidator.equals(
    "history dueDateBefore should match due_date",
    history.dueDateBefore,
    todo.dueDate,
  );
}
