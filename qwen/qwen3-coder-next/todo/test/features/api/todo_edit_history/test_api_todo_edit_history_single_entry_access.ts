import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEdit";
import type { ITodoAppEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistoryEntry";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEdit";
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

export async function test_api_todo_edit_history_single_entry_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register two test users
  const userAConnection: api.IConnection = { host: connection.host };
  const userBConnection: api.IConnection = { host: connection.host };
  const userA = await api.functional.todoApp.auth.member.join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  const userB = await api.functional.todoApp.auth.member.join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  // 2. User A creates a todo
  const todo = await api.functional.todoApp.member.todos.create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. User A edits the todo to generate edit history
  const firstEdit = await api.functional.todoApp.member.todos.update(
    userAConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(firstEdit);
  // 4. Get edit history list
  const historyList = await api.functional.todoApp.member.todos.histories.index(
    userAConnection,
    {
      todoId: todo.id,
      body: { page: 1, limit: 10 } satisfies ITodoAppTodoEdit.IRequest,
    },
  );
  typia.assert(historyList);
  TestValidator.predicate(
    "has at least one edit history entry",
    historyList.data.length >= 1,
  );
  const firstHistoryEntry = historyList.data[0];
  // 5. Retrieve specific history entry
  const historyEntry = await api.functional.todoApp.member.todos.histories.at(
    userAConnection,
    {
      todoId: todo.id,
      historyId: firstHistoryEntry.id,
    },
  );
  typia.assert(historyEntry);
  // 6. Validate history entry structure
  TestValidator.equals(
    "history entry ID matches",
    historyEntry.id,
    firstHistoryEntry.id,
  );
  // Removed validation for non-existent property todo_app_todo_edit_id on ISummary
  TestValidator.predicate("created_at is valid ISO 8601 timestamp", () => {
    const date = new Date(historyEntry.created_at);
    return !isNaN(date.getTime());
  });
  // 7. Validate field change tracking (for title and description changes)
  TestValidator.notEquals(
    "title changed (previous !== new)",
    historyEntry.previous_title,
    historyEntry.new_title,
  );
  TestValidator.notEquals(
    "description changed (previous !== new)",
    historyEntry.previous_description,
    historyEntry.new_description,
  );
  // 8. Test unauthorized access (User B trying to access User A's history)
  await TestValidator.error(
    "User B cannot access User A's history",
    async () => {
      await api.functional.todoApp.member.todos.histories.at(userBConnection, {
        todoId: todo.id,
        historyId: firstHistoryEntry.id,
      });
    },
  );
  // 9. Test non-existent history entry
  await TestValidator.error(
    "Non-existent history entry returns 404",
    async () => {
      await api.functional.todoApp.member.todos.histories.at(userAConnection, {
        todoId: todo.id,
        historyId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}