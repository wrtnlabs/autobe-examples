import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

export async function test_api_trash_list_with_deleted_todos(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create a todo item with title, description, and dates
  const createdTodo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Test Todo for Trash",
        description: "This is a test todo that will be moved to trash",
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(createdTodo);
  // 3. Soft-delete the todo
  await api.functional.todoApp.user.todos.erase(userConnection, {
    todoId: createdTodo.id,
  });
  // 4. Call the trash list endpoint with pagination parameters
  const trashList = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashList);
  // 5. Validate pagination values (structure already validated by typia.assert)
  TestValidator.equals(
    "pagination current page",
    trashList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", trashList.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records >= 1",
    trashList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    trashList.pagination.pages >= 1,
  );
  // 6. Find the deleted todo in trash
  TestValidator.predicate("trash list has data", trashList.data.length >= 1);
  const deletedTodoInTrash = trashList.data.find(
    (todo) => todo.id === createdTodo.id,
  );
  TestValidator.predicate(
    "deleted todo found in trash",
    deletedTodoInTrash !== undefined,
  );
  // 7. Validate the todo summary matches the created todo
  if (deletedTodoInTrash !== undefined) {
    TestValidator.equals(
      "todo id matches",
      deletedTodoInTrash.id,
      createdTodo.id,
    );
    TestValidator.equals(
      "todo title matches",
      deletedTodoInTrash.title,
      createdTodo.title,
    );
    TestValidator.equals(
      "todo is_completed matches",
      deletedTodoInTrash.is_completed,
      createdTodo.isCompleted,
    );
    TestValidator.equals(
      "todo start_date matches",
      deletedTodoInTrash.start_date,
      createdTodo.startDate,
    );
    TestValidator.equals(
      "todo due_date matches",
      deletedTodoInTrash.due_date,
      createdTodo.dueDate,
    );
    TestValidator.equals(
      "todo created_at matches",
      deletedTodoInTrash.created_at,
      createdTodo.createdAt,
    );
  }
  // 8. Validate description field is NOT included in summary (performance optimization)
  if (trashList.data.length > 0) {
    const todoKeys = Object.keys(trashList.data[0]);
    TestValidator.predicate(
      "description not in summary",
      !todoKeys.includes("description"),
    );
  }
}
