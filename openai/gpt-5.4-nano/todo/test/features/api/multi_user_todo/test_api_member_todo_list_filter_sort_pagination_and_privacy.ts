import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_edit_history_entry } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry";

export async function test_api_member_todo_list_filter_sort_pagination_and_privacy(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  TestValidator.predicate(
    "member b authorized",
    () => memberBAuthorized.id.length > 0,
  );
  const now = new Date();
  const startA2 = new Date(now.getTime() - 1000 * 60 * 60).toISOString();
  const startA3 = new Date(now.getTime() - 1000 * 30).toISOString();
  const dueA2 = new Date(now.getTime() - 1000 * 10).toISOString();
  const todoA1 = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todoA1);
  await generate_random_multi_user_todo_member_todos_create(memberAConnection, {
    body: {
      title: RandomGenerator.name(),
      description: null,
      startDate: startA2,
      dueDate: dueA2,
    } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
  });
  await generate_random_multi_user_todo_member_todos_create(memberAConnection, {
    body: {
      title: RandomGenerator.name(),
      description: null,
      startDate: startA3,
      dueDate: null,
    } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
  });
  const listPage1 = await api.functional.multiUserTodo.member.todos.index(
    memberAConnection,
    {
      body: {
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
        page: 1,
        limit: 2,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(listPage1);
  TestValidator.equals("pagination current", listPage1.pagination.current, 1);
  TestValidator.predicate(
    "pagination records non-negative",
    listPage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    listPage1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length within limit",
    listPage1.data.length <= listPage1.pagination.limit,
  );
  TestValidator.predicate("data contains required fields", () =>
    listPage1.data.every(
      (x) =>
        typeof x.id === "string" &&
        typeof x.title === "string" &&
        typeof x.completed === "boolean" &&
        typeof x.createdAt === "string" &&
        (x.startAt === null || typeof x.startAt === "string") &&
        (x.dueAt === null || typeof x.dueAt === "string"),
    ),
  );
  const listStartAsc = await api.functional.multiUserTodo.member.todos.index(
    memberAConnection,
    {
      body: {
        completionStatus: "all",
        sortBy: "startDate",
        sortOrder: "asc",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(listStartAsc);
  const startAtValues = listStartAsc.data.map((x) => x.startAt);
  const nullIndex = startAtValues.findIndex((x) => x === null);
  if (nullIndex !== -1) {
    const prefix = startAtValues.slice(0, nullIndex);
    const nullSuffix = startAtValues.slice(nullIndex);
    TestValidator.predicate(
      "startAt nulls are placed at end",
      nullSuffix.every((x) => x === null),
    );
    TestValidator.predicate(
      "non-null startAt before null",
      prefix.every((x) => x !== null),
    );
    const nonNull = prefix as (string & tags.Format<"date-time">)[];
    const sorted = [...nonNull].sort();
    TestValidator.equals(
      "startAt ordering is ascending for non-null values",
      nonNull,
      sorted,
    );
  }
  const todoB = await generate_random_multi_user_todo_member_todos_create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todoB);
  const listAfterPrivacy =
    await api.functional.multiUserTodo.member.todos.index(memberAConnection, {
      body: {
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoGuest.IRequest,
    });
  typia.assert(listAfterPrivacy);
  TestValidator.predicate(
    "member B todo id not leaked to member A",
    () => !listAfterPrivacy.data.some((x) => x.id === todoB.id),
  );
  TestValidator.predicate("member A todo id can appear in its own list", () =>
    listAfterPrivacy.data.some((x) => x.id === todoA1.id),
  );
}
