import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

export async function test_api_todo_trash_list_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Setup: Register member ───────────────────────────────────────────
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // ─── 2. Create 4 todos with varied attributes ────────────────────────────
  // Todo A: has keyword, will be completed, due_at = far future
  const todoA = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "FILTERTEST task alpha",
        description: null,
        started_at: null,
        due_at: "2027-06-01T00:00:00.000Z",
      },
    },
  );
  typia.assert(todoA);
  // Todo B: has keyword, will NOT be completed, due_at = near future
  const todoB = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "FILTERTEST task beta",
        description: null,
        started_at: null,
        due_at: "2026-04-01T00:00:00.000Z",
      },
    },
  );
  typia.assert(todoB);
  // Todo C: no keyword, will be completed, due_at = null
  const todoC = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Regular task gamma",
        description: null,
        started_at: "2026-01-01T00:00:00.000Z",
        due_at: null,
      },
    },
  );
  typia.assert(todoC);
  // Todo D: no keyword, will NOT be completed, due_at = mid future
  const todoD = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Regular task delta",
        description: null,
        started_at: null,
        due_at: "2026-10-01T00:00:00.000Z",
      },
    },
  );
  typia.assert(todoD);
  // ─── 3. Mark A and C as completed ────────────────────────────────────────
  const completedA = await api.functional.todoApp.member.todos.complete(
    memberConnection,
    {
      todoId: todoA.id,
    },
  );
  typia.assert(completedA);
  TestValidator.predicate(
    "Todo A is completed",
    completedA.is_completed === true,
  );
  const completedC = await api.functional.todoApp.member.todos.complete(
    memberConnection,
    {
      todoId: todoC.id,
    },
  );
  typia.assert(completedC);
  TestValidator.predicate(
    "Todo C is completed",
    completedC.is_completed === true,
  );
  // ─── 4. Soft-delete all 4 todos ──────────────────────────────────────────
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todoA.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todoB.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todoC.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todoD.id,
  });
  // ─── 5. Test: completionStatus = 'completed' ─────────────────────────────
  const completedPage = await api.functional.todoApp.member.todos.trashed.index(
    memberConnection,
    {
      body: {
        completionStatus: "completed",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completedPage);
  TestValidator.predicate(
    "all returned todos have trashed_at (completed filter)",
    completedPage.data.every((t) => t.trashed_at !== null),
  );
  TestValidator.predicate(
    "all returned todos are completed (completed filter)",
    completedPage.data.every((t) => t.is_completed === true),
  );
  TestValidator.predicate(
    "Todo A in completed results",
    completedPage.data.some((t) => t.id === todoA.id),
  );
  TestValidator.predicate(
    "Todo C in completed results",
    completedPage.data.some((t) => t.id === todoC.id),
  );
  TestValidator.predicate(
    "Todo B not in completed results",
    !completedPage.data.some((t) => t.id === todoB.id),
  );
  TestValidator.predicate(
    "Todo D not in completed results",
    !completedPage.data.some((t) => t.id === todoD.id),
  );
  // ─── 6. Test: completionStatus = 'incomplete' ────────────────────────────
  const incompletePage =
    await api.functional.todoApp.member.todos.trashed.index(memberConnection, {
      body: {
        completionStatus: "incomplete",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(incompletePage);
  TestValidator.predicate(
    "all returned todos have trashed_at (incomplete filter)",
    incompletePage.data.every((t) => t.trashed_at !== null),
  );
  TestValidator.predicate(
    "all returned todos are incomplete",
    incompletePage.data.every((t) => t.is_completed === false),
  );
  TestValidator.predicate(
    "Todo B in incomplete results",
    incompletePage.data.some((t) => t.id === todoB.id),
  );
  TestValidator.predicate(
    "Todo D in incomplete results",
    incompletePage.data.some((t) => t.id === todoD.id),
  );
  TestValidator.predicate(
    "Todo A not in incomplete results",
    !incompletePage.data.some((t) => t.id === todoA.id),
  );
  TestValidator.predicate(
    "Todo C not in incomplete results",
    !incompletePage.data.some((t) => t.id === todoC.id),
  );
  // ─── 7. Test: completionStatus = 'all' ───────────────────────────────────
  const allPage = await api.functional.todoApp.member.todos.trashed.index(
    memberConnection,
    {
      body: {
        completionStatus: "all",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allPage);
  TestValidator.predicate(
    "all returned todos have trashed_at (all filter)",
    allPage.data.every((t) => t.trashed_at !== null),
  );
  const allIds = allPage.data.map((t) => t.id);
  TestValidator.predicate(
    "all 4 todos in 'all' results",
    [todoA.id, todoB.id, todoC.id, todoD.id].every((id) => allIds.includes(id)),
  );
  // ─── 8. Test: Search matching keyword ────────────────────────────────────
  const searchMatchPage =
    await api.functional.todoApp.member.todos.trashed.index(memberConnection, {
      body: {
        search: "FILTERTEST",
        completionStatus: "all",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchMatchPage);
  TestValidator.predicate(
    "all returned todos have trashed_at (keyword filter)",
    searchMatchPage.data.every((t) => t.trashed_at !== null),
  );
  TestValidator.predicate(
    "search 'FILTERTEST' returns only keyword-matching todos",
    searchMatchPage.data.every((t) => t.title.includes("FILTERTEST")),
  );
  TestValidator.predicate(
    "Todo A in search results",
    searchMatchPage.data.some((t) => t.id === todoA.id),
  );
  TestValidator.predicate(
    "Todo B in search results",
    searchMatchPage.data.some((t) => t.id === todoB.id),
  );
  TestValidator.predicate(
    "Todo C not in search results",
    !searchMatchPage.data.some((t) => t.id === todoC.id),
  );
  TestValidator.predicate(
    "Todo D not in search results",
    !searchMatchPage.data.some((t) => t.id === todoD.id),
  );
  // ─── 9. Test: Search with no matching keyword ─────────────────────────────
  const searchNoMatchPage =
    await api.functional.todoApp.member.todos.trashed.index(memberConnection, {
      body: {
        search: "NOMATCHXYZ999",
        completionStatus: "all",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchNoMatchPage);
  TestValidator.predicate(
    "no-match search returns empty data array",
    searchNoMatchPage.data.length === 0,
  );
  // ─── 10. Test: Sort by createdAt desc ────────────────────────────────────
  const sortCreatedDescPage =
    await api.functional.todoApp.member.todos.trashed.index(memberConnection, {
      body: {
        completionStatus: "all",
        sortBy: "createdAt",
        sortDirection: "desc",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortCreatedDescPage);
  TestValidator.predicate(
    "all returned todos have trashed_at (createdAt desc sort)",
    sortCreatedDescPage.data.every((t) => t.trashed_at !== null),
  );
  for (let i = 0; i < sortCreatedDescPage.data.length - 1; i++) {
    const curr = sortCreatedDescPage.data[i]!;
    const next = sortCreatedDescPage.data[i + 1]!;
    TestValidator.predicate(
      `createdAt desc: item[${i}].created_at >= item[${i + 1}].created_at`,
      new Date(curr.created_at).getTime() >=
        new Date(next.created_at).getTime(),
    );
  }
  // ─── 11. Test: Sort by dueAt asc (nulls last) ────────────────────────────
  const sortDueAscPage =
    await api.functional.todoApp.member.todos.trashed.index(memberConnection, {
      body: {
        completionStatus: "all",
        sortBy: "dueAt",
        sortDirection: "asc",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortDueAscPage);
  TestValidator.predicate(
    "all returned todos have trashed_at (dueAt asc sort)",
    sortDueAscPage.data.every((t) => t.trashed_at !== null),
  );
  // Verify nulls-last: once a null due_at appears, all subsequent must also be null
  const firstNullIdx = sortDueAscPage.data.findIndex((t) => t.due_at === null);
  if (firstNullIdx !== -1) {
    TestValidator.predicate(
      "nulls last: no non-null due_at after first null due_at",
      sortDueAscPage.data.slice(firstNullIdx).every((t) => t.due_at === null),
    );
  }
  // Verify ascending order among non-null due_at items
  const withDueAt = sortDueAscPage.data.filter((t) => t.due_at !== null);
  for (let i = 0; i < withDueAt.length - 1; i++) {
    const curr = withDueAt[i]!;
    const next = withDueAt[i + 1]!;
    TestValidator.predicate(
      `dueAt asc: item[${i}].due_at <= item[${i + 1}].due_at`,
      new Date(curr.due_at!).getTime() <= new Date(next.due_at!).getTime(),
    );
  }
  // Verify known todos appear in correct relative order: B < D < A < C
  const dueIds = sortDueAscPage.data.map((t) => t.id);
  const idxB = dueIds.indexOf(todoB.id);
  const idxD = dueIds.indexOf(todoD.id);
  const idxA = dueIds.indexOf(todoA.id);
  const idxC = dueIds.indexOf(todoC.id);
  TestValidator.predicate("dueAt asc: B before D", idxB < idxD);
  TestValidator.predicate("dueAt asc: D before A", idxD < idxA);
  TestValidator.predicate("dueAt asc: A before C (null last)", idxA < idxC);
}
