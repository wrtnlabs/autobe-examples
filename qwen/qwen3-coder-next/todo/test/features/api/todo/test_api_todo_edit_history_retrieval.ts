import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEdit";
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

export async function test_api_todo_edit_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(memberSession);
  // 2. Create todo item
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Make multiple edits to generate edit history
  const edits = ArrayUtil.repeat(3, async (index) => {
    return await api.functional.todoApp.member.todos.update(memberConnection, {
      todoId: todo.id,
      body: {
        title: `Edited title ${index + 1}`,
        description: `Edited description ${index + 1}`,
      } satisfies ITodoAppTodo.IUpdate,
    });
  });
  const editedTodos = await Promise.all(edits);
  editedTodos.forEach((t) => typia.assert(t));
  // 4. Retrieve edit history with pagination
  const historyResult =
    await api.functional.todoApp.member.todos.histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoEdit.IRequest,
      },
    );
  typia.assert(historyResult);
  // 5. Verify history contains expected entries
  TestValidator.equals(
    "history has expected number of entries",
    historyResult.data.length,
    3,
  );
  TestValidator.predicate("history belongs to correct todo", () =>
    historyResult.data.every(
      (entry) =>
        entry.id && entry.edited_at && entry.previous_title !== undefined,
    ),
  );
  // 6. Verify history is sorted from most recent to oldest
  for (let i = 0; i < historyResult.data.length - 1; i++) {
    TestValidator.predicate(
      `history entry ${i} is newer than ${i + 1}`,
      () =>
        new Date(historyResult.data[i].edited_at).getTime() >
        new Date(historyResult.data[i + 1].edited_at).getTime(),
    );
  }
  // 7. Test timestamp filtering
  const oldestEntry = historyResult.data[historyResult.data.length - 1];
  const newestEntry = historyResult.data[0];
  const filteredResult =
    await api.functional.todoApp.member.todos.histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          edited_at_min: oldestEntry.edited_at,
          edited_at_max: newestEntry.edited_at,
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoEdit.IRequest,
      },
    );
  typia.assert(filteredResult);
  TestValidator.predicate(
    "filtered result includes entries within date range",
    () => filteredResult.data.length >= 1,
  );
}
