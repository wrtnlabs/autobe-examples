import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
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
 * Verify date sorting and private visibility boundaries for member todo lists.
 *
 * This test validates that the authenticated member only receives their own todos while another member's todos remain hidden. It also checks the todo list sorting rules for start date and due date in both ascending and descending directions, including the edge case where unscheduled todos must be placed at the end.
 *
 * 1. Create two authenticated members with separate todo data.
 * 2. Create several todos for the primary member using a mix of scheduled and unscheduled start and due dates.
 * 3. Create todos for the second member to verify that cross-account data never appears in the primary member's list.
 * 4. Request the primary member's todo list sorted by start date and due date in both directions.
 * 5. Validate ordering, null-placement behavior, and privacy isolation.
 */
export async function test_api_todo_list_sort_dates_and_hide_other_members(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: "1234!@#$" as string,
    } satisfies ITodoAppMember.IJoin,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = `${RandomGenerator.alphaNumeric(8)}-other@test.com`;
  await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: "1234!@#$" as string,
    } satisfies ITodoAppMember.IJoin,
  });
  const now: number = Date.now();
  const day: number = 24 * 60 * 60 * 1000;
  const a1 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: "A-start-earliest-due-latest",
        startDate: new Date(now + day).toISOString(),
        dueDate: new Date(now + day * 10).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  const a2 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: "A-start-middle-no-due",
        startDate: new Date(now + day * 5).toISOString(),
        dueDate: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  const a3 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: "A-start-latest-due-middle",
        startDate: new Date(now + day * 9).toISOString(),
        dueDate: new Date(now + day * 6).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  const a4 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: "A-no-start-due-earliest",
        startDate: null,
        dueDate: new Date(now + day).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  const a5 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: "A-no-start-no-due",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  await generate_random_todo_app_member_todos_create(memberBConnection, {
    body: {
      title: "B-start-earliest",
      startDate: new Date(now + day * 2).toISOString(),
      dueDate: new Date(now + day * 2).toISOString(),
    } satisfies ITodoAppTodo.ICreate,
  });
  await generate_random_todo_app_member_todos_create(memberBConnection, {
    body: {
      title: "B-no-start-no-due",
    } satisfies ITodoAppTodo.ICreate,
  });
  const byStartAsc = await api.functional.todoApp.member.todos.index(
    memberAConnection,
    {
      body: {
        sortBy: "startDate",
        sortOrder: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(byStartAsc);
  const byStartDesc = await api.functional.todoApp.member.todos.index(
    memberAConnection,
    {
      body: {
        sortBy: "startDate",
        sortOrder: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(byStartDesc);
  const byDueAsc = await api.functional.todoApp.member.todos.index(
    memberAConnection,
    {
      body: {
        sortBy: "dueDate",
        sortOrder: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(byDueAsc);
  const byDueDesc = await api.functional.todoApp.member.todos.index(
    memberAConnection,
    {
      body: {
        sortBy: "dueDate",
        sortOrder: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(byDueDesc);
  TestValidator.equals(
    "start-date ascending order",
    byStartAsc.data.map((todo) => todo.id),
    [a1.id, a2.id, a3.id, a4.id, a5.id],
  );
  TestValidator.equals(
    "start-date descending order",
    byStartDesc.data.map((todo) => todo.id),
    [a3.id, a2.id, a1.id, a4.id, a5.id],
  );
  TestValidator.equals(
    "due-date ascending order",
    byDueAsc.data.map((todo) => todo.id),
    [a4.id, a3.id, a1.id, a2.id, a5.id],
  );
  TestValidator.equals(
    "due-date descending order",
    byDueDesc.data.map((todo) => todo.id),
    [a1.id, a3.id, a4.id, a2.id, a5.id],
  );
  TestValidator.predicate(
    "start-date ascending pushes null start dates to the end",
    () => byStartAsc.data.slice(3).every((todo) => todo.startDate === null),
  );
  TestValidator.predicate(
    "due-date ascending pushes null due dates to the end",
    () => byDueAsc.data.slice(3).every((todo) => todo.dueDate === null),
  );
  TestValidator.predicate(
    "member A list excludes member B todos",
    () => !byStartAsc.data.some((todo) => todo.title.startsWith("B-")),
  );
  TestValidator.predicate("member A list contains only member A todos", () =>
    byStartAsc.data.every((todo) =>
      [a1.id, a2.id, a3.id, a4.id, a5.id].includes(todo.id),
    ),
  );
}
