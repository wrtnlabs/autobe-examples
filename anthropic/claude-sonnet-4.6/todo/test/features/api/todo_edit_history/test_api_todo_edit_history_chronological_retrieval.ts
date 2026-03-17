import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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

export async function test_api_todo_edit_history_chronological_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get an isolated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new todo with title only
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: null,
        started_at: null,
        due_at: null,
      },
    },
  );
  typia.assert(todo);
  // 3. Edit 1: Change the title to a new value
  const edit1Title = RandomGenerator.paragraph({ sentences: 1 });
  const afterEdit1 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: edit1Title,
        description: null,
        is_completed: false,
        started_at: null,
        due_at: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(afterEdit1);
  // 4. Edit 2: Add a description (keep same title as afterEdit1)
  const edit2Description = RandomGenerator.paragraph({ sentences: 2 });
  const afterEdit2 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: afterEdit1.title,
        description: edit2Description,
        is_completed: false,
        started_at: null,
        due_at: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(afterEdit2);
  // 5. Edit 3: Set a started_at date (keep same title and description)
  const edit3StartedAt = new Date().toISOString();
  const afterEdit3 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: afterEdit2.title,
        description: afterEdit2.description,
        is_completed: false,
        started_at: edit3StartedAt,
        due_at: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(afterEdit3);
  // 6. Test: Default pagination (asc order)
  const historyAsc =
    await api.functional.todoApp.member.todos.editHistories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 20,
          sortOrder: "asc",
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(historyAsc);
  // Verify pagination metadata
  TestValidator.equals("records count", historyAsc.pagination.records, 3);
  TestValidator.equals("current page", historyAsc.pagination.current, 1);
  TestValidator.equals("total pages", historyAsc.pagination.pages, 1);
  TestValidator.equals("data length", historyAsc.data.length, 3);
  // Verify each entry has correct todo_app_todo_id
  for (const entry of historyAsc.data) {
    TestValidator.equals("todo id matches", entry.todo_app_todo_id, todo.id);
  }
  // Verify ascending order by created_at
  for (let i = 0; i < historyAsc.data.length - 1; i++) {
    const curr = historyAsc.data[i]!;
    const next = historyAsc.data[i + 1]!;
    TestValidator.predicate(
      "ascending order",
      new Date(curr.created_at).getTime() <=
        new Date(next.created_at).getTime(),
    );
  }
  // Verify Edit 1 entry: title non-null, description null, started_at null, due_at null
  const entry1 = historyAsc.data[0]!;
  TestValidator.predicate("edit1 title non-null", entry1.title !== null);
  TestValidator.equals("edit1 description null", entry1.description, null);
  TestValidator.equals("edit1 started_at null", entry1.started_at, null);
  TestValidator.equals("edit1 due_at null", entry1.due_at, null);
  // Verify Edit 2 entry: title null, description non-null, started_at null, due_at null
  const entry2 = historyAsc.data[1]!;
  TestValidator.equals("edit2 title null", entry2.title, null);
  TestValidator.predicate(
    "edit2 description non-null",
    entry2.description !== null,
  );
  TestValidator.equals("edit2 started_at null", entry2.started_at, null);
  TestValidator.equals("edit2 due_at null", entry2.due_at, null);
  // Verify Edit 3 entry: title null, description null, started_at non-null, due_at null
  const entry3 = historyAsc.data[2]!;
  TestValidator.equals("edit3 title null", entry3.title, null);
  TestValidator.equals("edit3 description null", entry3.description, null);
  TestValidator.predicate(
    "edit3 started_at non-null",
    entry3.started_at !== null,
  );
  TestValidator.equals("edit3 due_at null", entry3.due_at, null);
  // 7. Sort Order Test: desc order
  const historyDesc =
    await api.functional.todoApp.member.todos.editHistories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 20,
          sortOrder: "desc",
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(historyDesc);
  // Verify total count remains 3
  TestValidator.equals("desc records count", historyDesc.pagination.records, 3);
  TestValidator.equals("desc data length", historyDesc.data.length, 3);
  // Verify descending order by created_at
  for (let i = 0; i < historyDesc.data.length - 1; i++) {
    const curr = historyDesc.data[i]!;
    const next = historyDesc.data[i + 1]!;
    TestValidator.predicate(
      "descending order",
      new Date(curr.created_at).getTime() >=
        new Date(next.created_at).getTime(),
    );
  }
  // Verify desc order is reversed: first item in desc = last item in asc
  TestValidator.equals(
    "desc[0] id = asc[2] id",
    historyDesc.data[0]!.id,
    historyAsc.data[2]!.id,
  );
  TestValidator.equals(
    "desc[2] id = asc[0] id",
    historyDesc.data[2]!.id,
    historyAsc.data[0]!.id,
  );
  // 8. Pagination Test: page=1, limit=1
  const historyPage1Limit1 =
    await api.functional.todoApp.member.todos.editHistories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 1,
          sortOrder: "asc",
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(historyPage1Limit1);
  TestValidator.equals(
    "page1 records",
    historyPage1Limit1.pagination.records,
    3,
  );
  TestValidator.equals("page1 pages", historyPage1Limit1.pagination.pages, 3);
  TestValidator.equals("page1 data length", historyPage1Limit1.data.length, 1);
  // page=1, limit=1 should return the oldest edit (entry1 from asc)
  TestValidator.equals(
    "page1 entry = oldest edit",
    historyPage1Limit1.data[0]!.id,
    entry1.id,
  );
  // 9. Pagination Test: page=2, limit=1
  const historyPage2Limit1 =
    await api.functional.todoApp.member.todos.editHistories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 2,
          limit: 1,
          sortOrder: "asc",
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(historyPage2Limit1);
  TestValidator.equals(
    "page2 records",
    historyPage2Limit1.pagination.records,
    3,
  );
  TestValidator.equals("page2 data length", historyPage2Limit1.data.length, 1);
  // page=2, limit=1 should return the second edit (entry2 from asc)
  TestValidator.equals(
    "page2 entry = second edit",
    historyPage2Limit1.data[0]!.id,
    entry2.id,
  );
}
