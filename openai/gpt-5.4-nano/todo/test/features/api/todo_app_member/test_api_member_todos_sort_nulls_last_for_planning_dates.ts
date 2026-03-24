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

export async function test_api_member_todos_sort_nulls_last_for_planning_dates(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(auth);
  const baseTitle = RandomGenerator.alphabets(12);
  const start1 = new Date(
    Date.now() + 1 * 60000,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const due1 = new Date(Date.now() + 2 * 60000).toISOString() satisfies string &
    tags.Format<"date-time">;
  const start2 = new Date(
    Date.now() + 3 * 60000,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const due3 = new Date(Date.now() + 4 * 60000).toISOString() satisfies string &
    tags.Format<"date-time">;
  const todoStartDue: ITodoAppTodo =
    await generate_random_todo_app_member_todos_create(memberConnection, {
      body: {
        title: `${baseTitle}-start-due`,
        start_date: start1,
        due_date: due1,
        description: null,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoStartDue);
  const todoStartOnly: ITodoAppTodo =
    await generate_random_todo_app_member_todos_create(memberConnection, {
      body: {
        title: `${baseTitle}-start-only`,
        start_date: start2,
        due_date: null,
        description: null,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoStartOnly);
  const todoDueOnly: ITodoAppTodo =
    await generate_random_todo_app_member_todos_create(memberConnection, {
      body: {
        title: `${baseTitle}-due-only`,
        start_date: null,
        due_date: due3,
        description: null,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoDueOnly);
  // start_date asc, nulls last
  const pageStart: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        completionStatusFilter: "all",
        sortBy: "start_date",
        sortDirection: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(pageStart);
  const startDates = pageStart.data.map((t) => t.start_date);
  TestValidator.predicate("contains null start_date item", () =>
    startDates.some((d) => d === null),
  );
  const firstNullIndex = startDates.findIndex((d) => d === null);
  if (firstNullIndex >= 0) {
    const hasNonNullAfterNull = startDates
      .slice(firstNullIndex)
      .some((d) => d !== null);
    TestValidator.predicate(
      "null start_date appears after all non-null start_date",
      () => !hasNonNullAfterNull,
    );
  }
  const nonNullStartDates = pageStart.data
    .filter((t) => t.start_date !== null)
    .map((t) => t.start_date as string & tags.Format<"date-time">);
  for (let i = 1; i < nonNullStartDates.length; i++) {
    TestValidator.predicate(
      `start_date asc at position ${i}`,
      () => nonNullStartDates[i - 1]! <= nonNullStartDates[i]!,
    );
  }
  // due_date asc, nulls last
  const pageDue: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        completionStatusFilter: "all",
        sortBy: "due_date",
        sortDirection: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(pageDue);
  const dueDates = pageDue.data.map((t) => t.due_date);
  TestValidator.predicate("contains null due_date item", () =>
    dueDates.some((d) => d === null),
  );
  const firstDueNullIndex = dueDates.findIndex((d) => d === null);
  if (firstDueNullIndex >= 0) {
    const hasNonNullDueAfterNull = dueDates
      .slice(firstDueNullIndex)
      .some((d) => d !== null);
    TestValidator.predicate(
      "null due_date appears after all non-null due_date",
      () => !hasNonNullDueAfterNull,
    );
  }
  const nonNullDueDates = pageDue.data
    .filter((t) => t.due_date !== null)
    .map((t) => t.due_date as string & tags.Format<"date-time">);
  for (let i = 1; i < nonNullDueDates.length; i++) {
    TestValidator.predicate(
      `due_date asc at position ${i}`,
      () => nonNullDueDates[i - 1]! <= nonNullDueDates[i]!,
    );
  }
  // Ensure index calls are read-only with respect to item identities
  TestValidator.equals(
    "todo set unchanged between sorts",
    [todoStartDue.id, todoStartOnly.id, todoDueOnly.id].sort(),
    pageDue.data.map((t) => t.id).sort(),
  );
}
