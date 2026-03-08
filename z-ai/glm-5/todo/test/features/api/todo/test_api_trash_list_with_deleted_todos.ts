import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_trash_list_with_deleted_todos(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo to be deleted
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Task to Delete",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Delete the todo (soft delete - moves to trash)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Request trash list
  const trashList = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        deleted: "trashed",
        sort_field: "created_at",
        sort_direction: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashList);
  // 5. Validate pagination metadata
  TestValidator.equals("current page", trashList.pagination.current, 1);
  TestValidator.predicate("limit is positive", trashList.pagination.limit > 0);
  TestValidator.predicate(
    "records count is at least 1",
    trashList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages is at least 1",
    trashList.pagination.pages >= 1,
  );
  // 6. Find the deleted todo in trash list
  const deletedTodo = trashList.data.find((item) => item.id === todo.id);
  TestValidator.predicate(
    "deleted todo found in trash",
    deletedTodo !== undefined,
  );
  // 7. Validate deleted todo properties
  if (deletedTodo) {
    TestValidator.equals("title matches", deletedTodo.title, todo.title);
    TestValidator.equals(
      "completed status matches",
      deletedTodo.completed,
      todo.completed,
    );
    TestValidator.equals("id matches", deletedTodo.id, todo.id);
    TestValidator.predicate(
      "deleted_at is set (not null)",
      deletedTodo.deleted_at !== null,
    );
    TestValidator.predicate(
      "created_at exists",
      deletedTodo.created_at !== null,
    );
  }
}
