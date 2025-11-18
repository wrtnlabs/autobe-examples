import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate combined text search and due date range filters for member todos
 * listing.
 *
 * Business goal: Ensure that PATCH /todoApp/memberUser/todos correctly applies
 * both a text search (on title) and a due-date range (dueFrom/dueTo)
 * simultaneously, returning only todos that satisfy both filters and belong to
 * the authenticated member.
 *
 * Scenario steps:
 *
 * 1. Admin bootstrap
 *
 *    - Register an adminUser via POST /auth/adminUser/join.
 *    - Create a system setting via POST /todoApp/adminUser/systemSettings to
 *         exercise that dependency (even if not strictly required for
 *         filters).
 * 2. Member bootstrap
 *
 *    - Register a memberUser via POST /auth/memberUser/join; the SDK will set the
 *         Authorization header for subsequent member-scoped calls.
 * 3. Seed todos for the member via POST /todoApp/memberUser/todos:
 *
 *    - Create multiple todos such that: a) Two todos contain the keyword in their
 *         title and have due_date inside a chosen [dueFrom, dueTo] window
 *         ("in-window + keyword"). b) One todo contains the keyword but has
 *         due_date outside the window ("keyword only"). c) One todo has
 *         due_date inside the window but title without the keyword ("window
 *         only"). d) One todo without keyword and outside the window.
 * 4. Invoke PATCH /todoApp/memberUser/todos with ITodoAppTodo.IRequest:
 *
 *    - Page = 0, limit large enough to contain all seeded todos.
 *    - Search = keyword.
 *    - DueFrom/dueTo set to the window that includes only the "in-window + keyword"
 *         todos.
 * 5. Assertions:
 *
 *    - Response passes typia.assert as IPageITodoAppTodo.ISummary.
 *    - Pagination.current and pagination.limit equal the request values.
 *    - Every returned todo summary has title including the keyword and due_date
 *         within [dueFrom, dueTo].
 *    - Todos with keyword-only or window-only or outside-all characteristics are not
 *         included.
 *    - Returned todo IDs are a subset of the IDs we created for this member.
 */
export async function test_api_todo_list_with_text_search_and_date_range_filters(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap: register admin and create a system setting
  const adminEmail: string = typia.random<string & tags.Format<"email">>();

  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(2),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const systemSettingBody = {
    key: "todo_search_enabled",
    value: "true",
    type: "boolean",
    description: "Enable text search and due date filters for todo listings",
    group: "features",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 2. Member bootstrap: register member user (Authorization is set by SDK)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();

  const memberJoinBody = {
    email: memberEmail,
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://todo-app.test/join",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Seed todos for that member
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const windowStart = new Date(now.getTime() + dayMs * 3);
  const windowEnd = new Date(now.getTime() + dayMs * 7);

  const dueInWindow1 = new Date(windowStart.getTime() + dayMs);
  const dueInWindow2 = new Date(windowEnd.getTime() - dayMs);

  const keyword = "project";

  const todoInWindowKeyword1Body = {
    title: `${keyword} alpha task`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: dueInWindow1.toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todoInWindowKeyword2Body = {
    title: `beta ${keyword} follow-up`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: dueInWindow2.toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todoKeywordOutsideWindowBody = {
    title: `${keyword} far future`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    due_date: new Date(now.getTime() + dayMs * 30).toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todoWindowOnlyBody = {
    title: "miscellaneous chores", // no keyword
    description: RandomGenerator.paragraph({ sentences: 2 }),
    due_date: new Date(windowStart.getTime() + dayMs / 2).toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todoOutsideAllBody = {
    title: "unrelated note", // no keyword
    description: RandomGenerator.paragraph({ sentences: 2 }),
    due_date: new Date(now.getTime() + dayMs * 20).toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodos: ITodoAppTodo[] = [];

  const createdInWindowKeyword1: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoInWindowKeyword1Body,
    });
  typia.assert(createdInWindowKeyword1);
  createdTodos.push(createdInWindowKeyword1);

  const createdInWindowKeyword2: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoInWindowKeyword2Body,
    });
  typia.assert(createdInWindowKeyword2);
  createdTodos.push(createdInWindowKeyword2);

  const createdKeywordOutside: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoKeywordOutsideWindowBody,
    });
  typia.assert(createdKeywordOutside);
  createdTodos.push(createdKeywordOutside);

  const createdWindowOnly: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoWindowOnlyBody,
    });
  typia.assert(createdWindowOnly);
  createdTodos.push(createdWindowOnly);

  const createdOutsideAll: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoOutsideAllBody,
    });
  typia.assert(createdOutsideAll);
  createdTodos.push(createdOutsideAll);

  const createdTodoIds = createdTodos.map((t) => t.id);

  // Build search window and request
  const dueFrom = windowStart.toISOString();
  const dueTo = windowEnd.toISOString();

  const requestBody = {
    page: 0,
    limit: 20,
    search: keyword,
    state: null,
    createdFrom: null,
    createdTo: null,
    dueFrom,
    dueTo,
    completed: null,
  } satisfies ITodoAppTodo.IRequest;

  const page: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.memberUser.todos.index(connection, {
      body: requestBody,
    });
  typia.assert(page);

  const pagination = page.pagination;
  const summaries = page.data;

  // Basic pagination coherence checks
  TestValidator.equals(
    "pagination current page should match request",
    pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination limit should match request",
    pagination.limit,
    requestBody.limit,
  );

  // All returned todos must match keyword AND due-date window and belong to this member
  await TestValidator.predicate(
    "all returned todos must contain keyword in title and have due_date within window",
    async () => {
      for (const summary of summaries) {
        const titleHasKeyword = summary.title.toLowerCase().includes(keyword);
        if (!titleHasKeyword) return false;

        if (summary.due_date === null || summary.due_date === undefined) {
          return false;
        }
        const dueTs = new Date(summary.due_date).getTime();
        const fromTs = new Date(dueFrom).getTime();
        const toTs = new Date(dueTo).getTime();
        if (dueTs < fromTs || dueTs > toTs) return false;

        if (!createdTodoIds.includes(summary.id)) return false;
      }
      return true;
    },
  );

  // Expect the two in-window+keyword todos to be present
  const expectedIds = [createdInWindowKeyword1.id, createdInWindowKeyword2.id];

  const returnedIds = summaries.map((s) => s.id);

  for (const expectedId of expectedIds) {
    TestValidator.predicate(
      `expected todo ${expectedId} should be included in results`,
      returnedIds.includes(expectedId),
    );
  }

  // Todos that do not satisfy both filters must be excluded
  const excludedCandidates = [
    createdKeywordOutside.id,
    createdWindowOnly.id,
    createdOutsideAll.id,
  ];

  for (const excludedId of excludedCandidates) {
    TestValidator.predicate(
      `todo ${excludedId} should be excluded by filters`,
      !returnedIds.includes(excludedId),
    );
  }
}
