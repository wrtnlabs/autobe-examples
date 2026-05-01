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

/**
 * Test trash list filtering and sorting with mixed completion statuses and date configurations.
 *
 * Validates that the trash list endpoint correctly filters by completion status
 * (all, complete, incomplete) and sorts by creation date, start date, and due
 * date with proper null handling. Multiple todos with different date
 * configurations and completion states are created, toggled, and soft-deleted
 * to exercise all filtering and sorting combinations.
 *
 * 1. Register and authenticate a new member.
 * 2. Create a todo with title only and no dates — toggled complete.
 * 3. Create a todo with title and due_date only — remains incomplete.
 * 4. Create a todo with title, start_date, and due_date — toggled complete.
 * 5. Toggle first and third todos to complete, then soft-delete all three.
 * 6. Filter by completion=all — verify 3 items returned with correct pagination.
 * 7. Filter by completion=complete — verify 2 items, both with completed_at set.
 * 8. Filter by completion=incomplete — verify 1 item with null completed_at.
 * 9. Sort by created_at ascending — verify oldest-first ordering.
 * 10. Sort by start_date descending — verify null start_date items appear last.
 * 11. Sort by due_date ascending — verify null due_date item appears last.
 */
export async function test_api_trash_list_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create todo1: title only, no dates — will be toggled complete
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: { start_date: null, due_date: null },
    },
  );
  typia.assert(todo1);
  // 3. Create todo2: title + due_date only — remains incomplete
  const dueDate2 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: { due_date: dueDate2 },
    },
  );
  typia.assert(todo2);
  // 4. Create todo3: title + start_date + due_date — will be toggled complete
  const startDate3 = new Date(
    Date.now() + 1 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dueDate3 = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const todo3 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: { start_date: startDate3, due_date: dueDate3 },
    },
  );
  typia.assert(todo3);
  // 5. Toggle todo1 and todo3 to complete
  const toggled1 = await api.functional.todoApp.member.todos.toggle(
    memberConnection,
    {
      todoId: todo1.id,
    },
  );
  typia.assert(toggled1);
  const toggled3 = await api.functional.todoApp.member.todos.toggle(
    memberConnection,
    {
      todoId: todo3.id,
    },
  );
  typia.assert(toggled3);
  // 6. Soft-delete all three todos
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo1.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo2.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo3.id,
  });
  // 7. Filter: completion=all — all 3 returned
  const allResult = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: { completion: "all" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allResult);
  TestValidator.equals("all: item count", allResult.data.length, 3);
  TestValidator.equals(
    "all: pagination records",
    allResult.pagination.records,
    3,
  );
  TestValidator.equals("all: pagination pages", allResult.pagination.pages, 1);
  // 8. Filter: completion=complete — 2 returned, both with completed_at not null
  const completeResult = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: { completion: "complete" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completeResult);
  TestValidator.equals("complete: item count", completeResult.data.length, 2);
  TestValidator.predicate(
    "complete: all have completed_at",
    completeResult.data.every((t) => t.completed_at !== null),
  );
  // 9. Filter: completion=incomplete — 1 returned, completed_at null
  const incompleteResult =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: { completion: "incomplete" } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(incompleteResult);
  TestValidator.equals(
    "incomplete: item count",
    incompleteResult.data.length,
    1,
  );
  TestValidator.equals(
    "incomplete: completed_at is null",
    incompleteResult.data[0].completed_at,
    null,
  );
  // 10. Sort: created_at ascending — oldest first
  const sortedByCreatedAsc =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: {
        sort: "created_at",
        direction: "asc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortedByCreatedAsc);
  TestValidator.equals(
    "created_at asc: item count",
    sortedByCreatedAsc.data.length,
    3,
  );
  TestValidator.equals(
    "created_at asc: order",
    sortedByCreatedAsc.data.map((t) => t.id),
    [todo1.id, todo2.id, todo3.id],
  );
  // 11. Sort: start_date descending — nulls appear last
  const sortedByStartDesc =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: {
        sort: "start_date",
        direction: "desc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortedByStartDesc);
  TestValidator.equals(
    "start_date desc: item count",
    sortedByStartDesc.data.length,
    3,
  );
  TestValidator.equals(
    "start_date desc: first is todo3",
    sortedByStartDesc.data[0].id,
    todo3.id,
  );
  TestValidator.predicate(
    "start_date desc: null start_date items last",
    sortedByStartDesc.data[1].start_date === null &&
      sortedByStartDesc.data[2].start_date === null,
  );
  // 12. Sort: due_date ascending — nulls appear last
  const sortedByDueAsc = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        sort: "due_date",
        direction: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedByDueAsc);
  TestValidator.equals(
    "due_date asc: item count",
    sortedByDueAsc.data.length,
    3,
  );
  TestValidator.equals(
    "due_date asc: first is todo2",
    sortedByDueAsc.data[0].id,
    todo2.id,
  );
  TestValidator.equals(
    "due_date asc: second is todo3",
    sortedByDueAsc.data[1].id,
    todo3.id,
  );
  TestValidator.equals(
    "due_date asc: last is todo1",
    sortedByDueAsc.data[2].id,
    todo1.id,
  );
}
