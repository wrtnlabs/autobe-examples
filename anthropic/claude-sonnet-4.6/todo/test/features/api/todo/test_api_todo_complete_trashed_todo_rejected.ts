import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
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

export async function test_api_todo_complete_trashed_todo_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  TestValidator.equals("todo is not completed", todo.is_completed, false);
  TestValidator.equals("todo is not trashed", todo.trashed_at, null);
  // Step 3: Move the todo to trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // Step 4 & 5: Attempt to complete the trashed todo — must fail
  await TestValidator.httpError(
    "cannot complete trashed todo",
    [400, 422],
    async () => {
      await api.functional.todoApp.member.todos.complete(memberConnection, {
        todoId: todo.id,
      });
    },
  );
  // Step 6: Confirm the todo remains trashed and incomplete
  const trashedPage = await api.functional.todoApp.member.todos.trashed.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashedPage);
  const trashedTodo = trashedPage.data.find((t) => t.id === todo.id);
  TestValidator.predicate(
    "trashed todo still exists in trash",
    trashedTodo !== undefined,
  );
  typia.assertGuard(trashedTodo!);
  TestValidator.equals(
    "todo is still not completed",
    trashedTodo.is_completed,
    false,
  );
  TestValidator.predicate(
    "todo still has trashed_at set",
    trashedTodo.trashed_at !== null,
  );
}
