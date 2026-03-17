import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPrivateTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPrivateTodoAppTodoEditHistory";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import type { IPrivateTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

export async function test_api_edit_history_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Create a todo with original values
  const originalTitle = "Original Task";
  const originalDescription = "Initial description";
  const todo = await generate_random_private_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        description: originalDescription,
      } satisfies IPrivateTodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Update the todo to create an edit history entry
  const updatedTitle = "Updated Task";
  const updatedDescription = "New description";
  const updatedTodo = await api.functional.privateTodoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
      } satisfies IPrivateTodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. List edit history to get the edit history ID
  const editHistoryList =
    await api.functional.privateTodoApp.member.todos.editHistories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IPrivateTodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(editHistoryList);
  TestValidator.predicate(
    "edit history list should have at least one entry",
    editHistoryList.data.length > 0,
  );
  const editHistorySummary = editHistoryList.data[0];
  // 5. Retrieve the specific edit history entry
  const editHistory =
    await api.functional.privateTodoApp.member.todos.editHistories.at(
      memberConnection,
      {
        todoId: todo.id,
        editHistoryId: editHistorySummary.id,
      },
    );
  typia.assert(editHistory);
  // 6. Verify the edit history entry
  TestValidator.equals(
    "edit history ID matches",
    editHistory.id,
    editHistorySummary.id,
  );
  TestValidator.equals(
    "todo ID in parent matches",
    editHistory.todo.id,
    todo.id,
  );
  TestValidator.equals(
    "title shows updated value",
    editHistory.title,
    updatedTitle,
  );
  TestValidator.equals(
    "description shows updated value",
    editHistory.description,
    updatedDescription,
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    editHistory.created_at !== null && editHistory.created_at !== undefined,
  );
}
