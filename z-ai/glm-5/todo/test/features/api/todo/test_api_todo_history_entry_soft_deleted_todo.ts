import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
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

export async function test_api_todo_history_entry_soft_deleted_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a todo with title and due date
  const originalDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days from now
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Task to Delete",
        dueDate: originalDueDate,
      },
    },
  );
  typia.assert(todo);
  // 3. Edit the todo to change due date - this creates a history entry
  const newDueDate = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 14 days from now
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: "Task to Delete",
        dueDate: newDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Soft-delete the todo (move to trash)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // Note: To complete this test, we would need to:
  // 1. Call GET /todoApp/member/todos/{todoId}/histories to list history entries
  // 2. Get the historyId from the list
  // 3. Call GET /todoApp/member/todos/{todoId}/histories/{historyId}
  // 4. Validate that:
  //    - History is accessible even though todo is soft-deleted
  //    - deleted_at is set on the todo summary
  //    - dueDateChange contains the new due date
  //
  // However, the 'list histories' endpoint is not available in the current API.
  // The histories.at endpoint requires a historyId that cannot be obtained.
  //
  // This test validates the setup (create, edit, soft-delete) but cannot
  // verify the history accessibility without the missing endpoint.
}
