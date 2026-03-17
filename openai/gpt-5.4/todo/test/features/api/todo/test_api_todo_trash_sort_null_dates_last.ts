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

export async function test_api_todo_trash_sort_null_dates_last(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!" satisfies string as string &
        tags.Format<"password">,
      href: "https://example.com/todos/trash",
      referrer: "https://example.com/todos",
      ip: "127.0.0.1" satisfies string as string & tags.Format<"ipv4">,
    },
  });
  typia.assert(authorized);
  const activeTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: `active-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: "2026-01-15T09:00:00.000Z",
        dueDate: "2026-01-20T09:00:00.000Z",
      },
    },
  );
  typia.assert(activeTodo);
  const trashCreateInputs = [
    {
      title: `trash-${RandomGenerator.alphabets(6)}-1`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      startDate: "2026-01-01T09:00:00.000Z",
      dueDate: "2026-02-01T09:00:00.000Z",
    },
    {
      title: `trash-${RandomGenerator.alphabets(6)}-2`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      startDate: "2026-01-03T09:00:00.000Z",
      dueDate: null,
    },
    {
      title: `trash-${RandomGenerator.alphabets(6)}-3`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      startDate: null,
      dueDate: "2026-01-10T09:00:00.000Z",
    },
    {
      title: `trash-${RandomGenerator.alphabets(6)}-4`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      startDate: "2026-01-02T09:00:00.000Z",
      dueDate: "2026-01-15T09:00:00.000Z",
    },
    {
      title: `trash-${RandomGenerator.alphabets(6)}-5`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      startDate: null,
      dueDate: null,
    },
    {
      title: `trash-${RandomGenerator.alphabets(6)}-6`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      startDate: "2026-01-04T09:00:00.000Z",
      dueDate: "2026-01-05T09:00:00.000Z",
    },
  ] satisfies ITodoAppTodo.ICreate[];
  const trashedTodos = await ArrayUtil.asyncMap(
    trashCreateInputs,
    async (body) => {
      const created = await generate_random_todo_app_member_todos_create(
        memberConnection,
        { body },
      );
      typia.assert(created);
      await api.functional.todoApp.member.todos.erase(memberConnection, {
        todoId: created.id,
      });
      return created;
    },
  );
  const trashedIds = new Set(trashedTodos.map((todo) => todo.id));
  const assertNullsLast = (
    items: ITodoAppTodo.ISummary[],
    field: "start_date" | "due_date",
  ): void => {
    let encounteredNull = false;
    for (const item of items) {
      const value = item[field];
      if (value === null) encounteredNull = true;
      else {
        TestValidator.predicate(
          `${field} non-null values must precede null values`,
          encounteredNull === false,
        );
      }
    }
  };
  const assertOrdered = (
    items: ITodoAppTodo.ISummary[],
    field: "start_date" | "due_date",
    direction: "asc" | "desc",
  ): void => {
    const nonNulls = items
      .map((item) => item[field])
      .filter((value): value is string => value !== null);
    for (let i = 1; i < nonNulls.length; ++i) {
      TestValidator.predicate(
        `${field} ${direction} ordering at index ${i}`,
        direction === "asc"
          ? nonNulls[i - 1] <= nonNulls[i]
          : nonNulls[i - 1] >= nonNulls[i],
      );
    }
  };
  const assertTrashPage = (
    page: IPageITodoAppTodo.ISummary,
    activeId: string,
  ): void => {
    typia.assert(page);
    for (const item of page.data) {
      TestValidator.predicate(
        "trash result must be one of prepared deleted todo IDs",
        trashedIds.has(item.id),
      );
      TestValidator.notEquals(
        "active todo must not appear in trash",
        item.id,
        activeId,
      );
      TestValidator.notEquals(
        "trash item deleted_at must be non-null",
        item.deleted_at,
        null,
      );
    }
  };
  const startAsc = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        sort: "start_date_asc",
        page: 1,
        limit: 20,
      },
    },
  );
  assertTrashPage(startAsc, activeTodo.id);
  assertNullsLast(startAsc.data, "start_date");
  assertOrdered(startAsc.data, "start_date", "asc");
  const startDesc = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        sort: "start_date_desc",
        page: 1,
        limit: 20,
      },
    },
  );
  assertTrashPage(startDesc, activeTodo.id);
  assertNullsLast(startDesc.data, "start_date");
  assertOrdered(startDesc.data, "start_date", "desc");
  const dueAsc = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        sort: "due_date_asc",
        page: 1,
        limit: 20,
      },
    },
  );
  assertTrashPage(dueAsc, activeTodo.id);
  assertNullsLast(dueAsc.data, "due_date");
  assertOrdered(dueAsc.data, "due_date", "asc");
  const dueDesc = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        sort: "due_date_desc",
        page: 1,
        limit: 20,
      },
    },
  );
  assertTrashPage(dueDesc, activeTodo.id);
  assertNullsLast(dueDesc.data, "due_date");
  assertOrdered(dueDesc.data, "due_date", "desc");
  TestValidator.equals(
    "full start-date ascending record count matches prepared deleted todos",
    startAsc.pagination.records,
    trashedTodos.length,
  );
  TestValidator.equals(
    "full start-date ascending page data size matches prepared deleted todos",
    startAsc.data.length,
    trashedTodos.length,
  );
  TestValidator.equals(
    "full start-date ascending results are unique",
    new Set(startAsc.data.map((item) => item.id)).size,
    startAsc.data.length,
  );
  const pagedFirst = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        sort: "start_date_asc",
        page: 1,
        limit: 2,
      },
    },
  );
  typia.assert(pagedFirst);
  const pagedSecond = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        sort: "start_date_asc",
        page: 2,
        limit: 2,
      },
    },
  );
  typia.assert(pagedSecond);
  assertTrashPage(pagedFirst, activeTodo.id);
  assertTrashPage(pagedSecond, activeTodo.id);
  TestValidator.equals(
    "first page current is 1",
    pagedFirst.pagination.current,
    1,
  );
  TestValidator.equals(
    "second page current is 2",
    pagedSecond.pagination.current,
    2,
  );
  TestValidator.equals(
    "paged limits match requested limit",
    pagedFirst.pagination.limit,
    2,
  );
  TestValidator.equals(
    "second page limit matches requested limit",
    pagedSecond.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination records remain stable across pages",
    pagedFirst.pagination.records,
    pagedSecond.pagination.records,
  );
  TestValidator.equals(
    "pagination pages remain stable across pages",
    pagedFirst.pagination.pages,
    pagedSecond.pagination.pages,
  );
  const combinedPageIds = [...pagedFirst.data, ...pagedSecond.data].map(
    (item) => item.id,
  );
  const expectedPrefixIds = startAsc.data
    .slice(0, combinedPageIds.length)
    .map((item) => item.id);
  TestValidator.equals(
    "paged results match full sorted prefix",
    combinedPageIds,
    expectedPrefixIds,
  );
  TestValidator.equals(
    "page 1 and page 2 have no overlap",
    new Set(combinedPageIds).size,
    combinedPageIds.length,
  );
}
