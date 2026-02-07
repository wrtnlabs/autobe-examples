import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";
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

export async function test_api_todo_trash_index(connection: api.IConnection) {
  // 1. Authenticate as a user for the test
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<ITodoUser.IJoin>(),
  });
  // 2. Create a todo item to delete and move to trash
  const todo = await api.functional.todo.user.todos.create(userConnection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.content({ paragraphs: 1 }),
      start_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  typia.assert(todo);
  // 3. Delete the created todo item to populate the trash
  const erasedTodo = await api.functional.todo.user.todos.erase(
    userConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(erasedTodo);
  TestValidator.notEquals(
    "deleted_at should not be null after deletion",
    erasedTodo.deleted_at,
    null,
  );
  // 4. Retrieve the paginated list of soft-deleted todo items from trash
  const trashItems = await api.functional.todo.user.trash.index(userConnection);
  typia.assert(trashItems);
  // 5. Validate the trash contents
  TestValidator.predicate(
    "trash should contain items",
    trashItems.data.length > 0,
  );
  TestValidator.equals(
    "deleted item should be in trash",
    trashItems.data.map((item) => item.id).includes(todo.id),
    true,
  );
  TestValidator.equals(
    "pagination metadata should exist",
    trashItems.pagination.current,
    1,
  );
}
