import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppEditHistory";
import type { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
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

/**
 * Verify that edit history remains accessible after a todo is soft-deleted.
 *
 * Validates that editing a todo multiple times before soft deletion creates persistent edit history entries. After soft-deletion (moving to trash), the edit history should still be queryable and return all recorded changes with their timestamps and field-level modification data.
 *
 * According to business rules, edit history is only removed when a todo is permanently deleted from trash, not when soft-deleted.
 *
 * 1. Authenticate as a new member.
 * 2. Create a todo with an initial title.
 * 3. Edit the todo twice to generate multiple edit history entries.
 * 4. Soft-delete the todo to move it to trash.
 * 5. Retrieve edit history for the soft-deleted todo.
 * 6. Validate that at least 2 history entries exist with timestamp and field change data.
 */
export async function test_api_todo_edit_history_accessible_after_soft_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a todo
  const todo =
    await generate_random_todo_app_member_todos_create(memberConnection);
  typia.assert(todo);
  // 3. Edit the todo twice to generate edit history entries
  const updatedTitle1 = RandomGenerator.name();
  const updatedTodo1 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: { title: updatedTitle1 } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo1);
  const updatedTitle2 = RandomGenerator.name();
  const updatedTodo2 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: { title: updatedTitle2 } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo2);
  // 4. Soft-delete the todo (move to trash)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 5. Retrieve edit history for the soft-deleted todo
  const editHistory =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {} satisfies ITodoAppEditHistory.IRequest,
      },
    );
  typia.assert(editHistory);
  // 6. Validate edit history is accessible and contains entries
  TestValidator.predicate(
    "edit history has at least 2 entries after soft delete",
    editHistory.data.length >= 2,
  );
  // 7. Validate history entries contain expected field-level change data
  const titleChanges = editHistory.data.filter((entry) => entry.title !== null);
  TestValidator.predicate(
    "edit history contains title changes",
    titleChanges.length >= 2,
  );
  // Validate pagination metadata
  TestValidator.equals("current page", editHistory.pagination.current, 1);
  TestValidator.predicate(
    "has valid record count",
    editHistory.pagination.records >= 2,
  );
}
