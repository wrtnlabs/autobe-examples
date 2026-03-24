import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistoryEntry";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
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

export async function test_api_todo_history_pagination_newest_to_oldest_and_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A: join
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  // 2) Create todo for Member A
  const baseTitle = RandomGenerator.name();
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: baseTitle,
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Prepare edit payloads (each edit changes at least one field)
  const title2 = `${baseTitle} - v2`;
  const description1 = RandomGenerator.paragraph({ sentences: 2 });
  const startDate1 = new Date(Date.now() - 1000 * 60 * 60 * 24);
  const dueDate1 = new Date(Date.now() + 1000 * 60 * 60 * 24);
  const dueDate2 = new Date(Date.now() + 1000 * 60 * 60 * 48);
  // 3) Perform multiple edits to create history entries
  // Edit #1: title change
  await api.functional.todoApp.member.todos.update(memberAConnection, {
    todoId: todo.id,
    body: {
      title: title2,
      description: null,
      start_date: null,
      due_date: null,
    } satisfies ITodoAppTodo.IUpdate,
  });
  // Edit #2: description change
  await api.functional.todoApp.member.todos.update(memberAConnection, {
    todoId: todo.id,
    body: {
      title: title2,
      description: description1,
      start_date: null,
      due_date: null,
    } satisfies ITodoAppTodo.IUpdate,
  });
  // Edit #3: start & due date change
  await api.functional.todoApp.member.todos.update(memberAConnection, {
    todoId: todo.id,
    body: {
      title: title2,
      description: description1,
      start_date: startDate1.toISOString() as string & tags.Format<"date-time">,
      due_date: dueDate1.toISOString() as string & tags.Format<"date-time">,
    } satisfies ITodoAppTodo.IUpdate,
  });
  // Edit #4: due date change only
  await api.functional.todoApp.member.todos.update(memberAConnection, {
    todoId: todo.id,
    body: {
      title: title2,
      description: description1,
      start_date: startDate1.toISOString() as string & tags.Format<"date-time">,
      due_date: dueDate2.toISOString() as string & tags.Format<"date-time">,
    } satisfies ITodoAppTodo.IUpdate,
  });
  // 4) Fetch full timeline for validation baselines
  const fullHistory = await api.functional.todoApp.member.todos.history.index(
    memberAConnection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodoHistoryEntry.IRequest,
    },
  );
  typia.assert(fullHistory);
  TestValidator.predicate(
    "should have at least 4 history entries",
    () => fullHistory.data.length >= 4,
  );
  // Ensure newest-to-oldest ordering by created_at
  for (let i = 1; i < fullHistory.data.length; ++i) {
    TestValidator.predicate(
      `history order at index ${i}`,
      fullHistory.data[i - 1].created_at >= fullHistory.data[i].created_at,
    );
  }
  const totalRecords = fullHistory.pagination.records;
  const totalPages = fullHistory.pagination.pages;
  TestValidator.equals(
    "records matches full data length",
    totalRecords,
    fullHistory.data.length,
  );
  TestValidator.equals(
    "pages matches Math.ceil(records/limit)",
    totalPages,
    Math.ceil(fullHistory.pagination.records / fullHistory.pagination.limit),
  );
  // 5) Pagination: page=1 limit=2
  const limit = 2;
  const page1 = await api.functional.todoApp.member.todos.history.index(
    memberAConnection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit,
      } satisfies ITodoAppTodoHistoryEntry.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page1 current", page1.pagination.current, 1);
  TestValidator.equals("page1 limit", page1.pagination.limit, limit);
  TestValidator.equals("page1 records", page1.pagination.records, totalRecords);
  TestValidator.equals(
    "page1 pages",
    page1.pagination.pages,
    Math.ceil(totalRecords / limit),
  );
  // 6) Pagination: page=2 limit=2
  const page2 = await api.functional.todoApp.member.todos.history.index(
    memberAConnection,
    {
      todoId: todo.id,
      body: {
        page: 2,
        limit,
      } satisfies ITodoAppTodoHistoryEntry.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page2 current", page2.pagination.current, 2);
  TestValidator.equals("page2 limit", page2.pagination.limit, limit);
  // Validate no duplicates across page 1 and page 2
  const ids1 = new Set(page1.data.map((x) => x.id));
  for (const entry of page2.data) {
    TestValidator.predicate(
      "no duplicate history ids across pages",
      () => !ids1.has(entry.id),
    );
  }
  // Validate combined equals full timeline slice newest->oldest
  const combined = [...page1.data, ...page2.data];
  const expectedCombined = fullHistory.data.slice(0, combined.length);
  TestValidator.equals(
    "combined timeline matches full history slice",
    combined.map((x) => x.id),
    expectedCombined.map((x) => x.id),
  );
  // Validate changed_* field nullability for the first two history entries in page1
  // Because we always changed specific fields per edit, map newest->oldest:
  // fullHistory.data[0] corresponds to Edit #4 (due date only)
  // fullHistory.data[1] corresponds to Edit #3 (start & due)
  const newest = fullHistory.data[0];
  const prev = fullHistory.data[1];
  TestValidator.equals(
    "Edit#4 changed_due_date",
    newest.changed_due_date,
    dueDate2.toISOString(),
  );
  TestValidator.equals("Edit#4 changed_title null", newest.changed_title, null);
  TestValidator.equals(
    "Edit#4 changed_description null",
    newest.changed_description,
    null,
  );
  TestValidator.equals(
    "Edit#4 changed_start_date null",
    newest.changed_start_date,
    null,
  );
  TestValidator.equals(
    "Edit#4 changed_completion_status null",
    newest.changed_completion_status,
    null,
  );
  TestValidator.equals(
    "Edit#3 changed_start_date",
    prev.changed_start_date,
    startDate1.toISOString(),
  );
  TestValidator.equals(
    "Edit#3 changed_due_date",
    prev.changed_due_date,
    dueDate1.toISOString(),
  );
  TestValidator.equals("Edit#3 changed_title null", prev.changed_title, null);
  TestValidator.equals(
    "Edit#3 changed_description null",
    prev.changed_description,
    null,
  );
  TestValidator.equals(
    "Edit#3 changed_completion_status null",
    prev.changed_completion_status,
    null,
  );
  // 7) Access control: Member B cannot access Member A todo history
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies ITodoAppMember.IJoin,
  });
  TestValidator.notEquals("member ids differ", memberA.id, memberB.id);
  const forbiddenHistory =
    await api.functional.todoApp.member.todos.history.index(memberBConnection, {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoHistoryEntry.IRequest,
    });
  typia.assert(forbiddenHistory);
  TestValidator.equals(
    "member B receives no history entries",
    forbiddenHistory.data.length,
    0,
  );
  // 8) Lifecycle: deny history after soft-delete (closest available to permanent delete)
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todo.id,
  });
  const afterDeleteHistory =
    await api.functional.todoApp.member.todos.history.index(memberAConnection, {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoHistoryEntry.IRequest,
    });
  typia.assert(afterDeleteHistory);
  TestValidator.equals(
    "no history entries after deletion lifecycle",
    afterDeleteHistory.data.length,
    0,
  );
}
