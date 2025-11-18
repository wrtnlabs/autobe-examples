import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppRateLimitEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppRateLimitEvent";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppRateLimitEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRateLimitEvent";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate pagination edge behaviors for admin rate limit events search.
 *
 * Business goal: Ensure that the administrative endpoint for searching
 * `todo_app_rate_limit_events` supports stable, predictable pagination
 * semantics with small page sizes, independent of the exact rate limiting
 * policies in effect.
 *
 * High‑level flow:
 *
 * 1. Create and authenticate a member user.
 * 2. As that member, perform multiple todo write and lifecycle operations
 *    (create/complete/reopen) to generate realistic traffic that may produce
 *    rate limit events.
 * 3. Create and authenticate an admin user.
 * 4. As admin, call PATCH /todoApp/adminUser/rateLimitEvents with a small pageSize
 *    to fetch page 1, then additional pages.
 * 5. Validate pagination metadata (current, limit, records, pages) and that
 *    data.length never exceeds the requested pageSize.
 * 6. Verify that event ids are not duplicated across pages.
 * 7. Request an out‑of‑range page index and confirm that it returns a well‑formed
 *    page object (with empty or bounded data) rather than an error.
 */
export async function test_api_admin_rate_limit_events_search_pagination_edges(
  connection: api.IConnection,
) {
  // 1. Register a member user (join implicitly authenticates the connection as member).
  const memberJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/signup",
    referrer: "https://landing.example.com/",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Explicit member login to exercise login flow and ensure session.
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://todo-app.example.com/login",
    referrer: "https://todo-app.example.com/",
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const memberLoginAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 3. Generate member todo traffic: create several todos, then complete/reopen some.
  const createdTodos: ITodoAppTodo[] = [];
  const todoCreateCount = 10;

  for (let i = 0; i < todoCreateCount; ++i) {
    const todoBody = {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body: todoBody,
      });
    typia.assert(todo);
    createdTodos.push(todo);
  }

  // For some of the todos, perform complete/reopen cycles to diversify lifecycle events.
  const cycleTargets = createdTodos.slice(0, 5);
  for (const todo of cycleTargets) {
    const completed: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.complete(connection, {
        todoId: todo.id,
      });
    typia.assert(completed);

    const reopened: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.reopen(connection, {
        todoId: todo.id,
      });
    typia.assert(reopened);
  }

  // 4. Register an admin user and authenticate as admin.
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}-admin@example.com`,
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Explicit admin login to ensure actor switching works and the token is fresh.
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://todo-app.example.com/admin/login",
    referrer: "https://todo-app.example.com/admin",
    user_agent: "todo-app-admin-e2e-test",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLoginAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 5. As admin, search rate limit events with a small page size starting at page 1.
  const pageSize = 2;

  const baseRequest: ITodoAppRateLimitEvent.IRequest = {
    actor_type: null,
    ip: null,
    limit_key: null,
    limit_type: null,
    window_start_from: null,
    window_start_to: null,
    page: 1,
    pageSize,
    sort_by: null,
    sort_order: null,
  };

  const firstPage: IPageITodoAppRateLimitEvent.ISummary =
    await api.functional.todoApp.adminUser.rateLimitEvents.index(connection, {
      body: baseRequest,
    });
  typia.assert(firstPage);

  const firstPagination = firstPage.pagination;

  // Basic pagination checks for page 1.
  TestValidator.equals(
    "first page current index must be 1",
    firstPagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit must equal requested pageSize",
    firstPagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "first page data length must be <= pageSize",
    firstPage.data.length <= pageSize,
  );

  // Accumulate ids to ensure no duplication across pages.
  const seenIds = new Set<string>();
  for (const event of firstPage.data) {
    seenIds.add(event.id);
  }

  // 6. Iterate over subsequent pages (if any) and validate pagination semantics.
  const totalPages = firstPagination.pages;
  TestValidator.predicate("total pages must be >= 0", totalPages >= 0);

  const pageVisitCap = Math.max(1, Math.min(totalPages, 5));
  for (let page = 2; page <= pageVisitCap; ++page) {
    const pageRequest: ITodoAppRateLimitEvent.IRequest = {
      ...baseRequest,
      page,
    };

    const pageResult: IPageITodoAppRateLimitEvent.ISummary =
      await api.functional.todoApp.adminUser.rateLimitEvents.index(connection, {
        body: pageRequest,
      });
    typia.assert(pageResult);

    const pagination = pageResult.pagination;
    TestValidator.equals(
      `page ${page} current index must equal requested page`,
      pagination.current,
      page,
    );
    TestValidator.equals(
      `page ${page} limit must equal requested pageSize`,
      pagination.limit,
      pageSize,
    );
    TestValidator.predicate(
      `page ${page} data length must be <= pageSize`,
      pageResult.data.length <= pageSize,
    );

    // Ensure no duplicate ids across pages we inspected.
    for (const event of pageResult.data) {
      TestValidator.predicate(
        `event id ${event.id} must not be duplicated across pages`,
        seenIds.has(event.id) === false,
      );
      seenIds.add(event.id);
    }
  }

  const observedCount = seenIds.size;
  const finalPagination = firstPage.pagination;

  // 7. Validate that records and pages are consistent with observed data.
  TestValidator.predicate(
    "observed event count must be <= total records",
    observedCount <= finalPagination.records,
  );
  TestValidator.predicate(
    "total records must be >= 0",
    finalPagination.records >= 0,
  );
  TestValidator.predicate(
    "pages must be consistent with records and limit",
    finalPagination.records <= finalPagination.pages * finalPagination.limit,
  );

  // 8. Request an out-of-range page and validate behavior, if there is at least 1 page.
  if (finalPagination.pages >= 1) {
    const outOfRangePageIndex = finalPagination.pages + 1;
    const outOfRangeRequest: ITodoAppRateLimitEvent.IRequest = {
      ...baseRequest,
      page: outOfRangePageIndex,
    };

    const outOfRangePage: IPageITodoAppRateLimitEvent.ISummary =
      await api.functional.todoApp.adminUser.rateLimitEvents.index(connection, {
        body: outOfRangeRequest,
      });
    typia.assert(outOfRangePage);

    const outPag = outOfRangePage.pagination;
    TestValidator.equals(
      "out-of-range page current index must equal requested page",
      outPag.current,
      outOfRangePageIndex,
    );
    TestValidator.equals(
      "out-of-range page limit must equal requested pageSize",
      outPag.limit,
      pageSize,
    );
    TestValidator.predicate(
      "out-of-range page should return empty or at most pageSize items",
      outOfRangePage.data.length <= pageSize,
    );
  }
}
