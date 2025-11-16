import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodouserSession";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";

export async function test_api_todo_admin_sessions_time_range_filtering(
  connection: api.IConnection,
) {
  // 1) Register and authenticate a todoAdmin (admin context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2) Register a todoUser (this also creates an initial session)
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const userJoinBody = {
    email: userEmail,
    password: userPassword,
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://app.todo-app.test/join",
    referrer: "https://app.todo-app.test/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const user: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(user);

  // 3) Create additional sessions for the todoUser by logging in multiple times
  const loginBody1 = {
    email: userEmail,
    password: userPassword,
    ip: "127.0.0.1",
    href: "https://app.todo-app.test/login1",
    referrer: "https://app.todo-app.test/home",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const login1: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: loginBody1,
    });
  typia.assert(login1);

  const loginBody2 = {
    email: userEmail,
    password: userPassword,
    ip: "127.0.0.2",
    href: "https://app.todo-app.test/login2",
    referrer: "https://app.todo-app.test/home",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const login2: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: loginBody2,
    });
  typia.assert(login2);

  // 4) Switch back to admin context by registering another admin (simplest way
  // to restore admin Authorization header using SDK behavior)
  const adminJoinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.10",
    href: "https://admin.todo-app.test/join2",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin2: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody2,
    });
  typia.assert(admin2);

  // 5) Call sessions.index without filters to get baseline sessions list
  const baselineRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ITodoAppTodouserSession.IRequest;

  const baseline: IPageITodoAppTodouserSession.ISummary =
    await api.functional.todoApp.todoAdmin.todoUsers.sessions.index(
      connection,
      {
        todoUserId: user.id,
        body: baselineRequestBody,
      },
    );
  typia.assert(baseline);

  // Basic sanity checks on pagination and ownership
  const baselinePagination: IPage.IPagination = baseline.pagination;
  const baselineData: ITodoAppTodouserSession.ISummary[] = baseline.data;

  TestValidator.predicate(
    "baseline sessions should contain at least 3 records",
    baselinePagination.records >= 3,
  );

  TestValidator.predicate(
    "baseline data length should not exceed limit",
    baselineData.length <= baselinePagination.limit,
  );
  TestValidator.predicate(
    "baseline data length should not exceed total records",
    baselineData.length <= baselinePagination.records,
  );

  for (const session of baselineData) {
    TestValidator.equals(
      "each session.todoUser.id must match queried todoUserId",
      session.todoUser.id,
      user.id,
    );
  }

  // 6) Identify a created_at value to use as a narrow filter window.
  // We will sort the in-memory baseline data by created_at ascending and pick
  // the middle session’s created_at.
  if (baselineData.length === 0) {
    // Defensive guard: although we expect >=3, do not fail the test with
    // runtime error; just return early.
    return;
  }

  const sortedByCreatedAt = [...baselineData].sort((a, b) => {
    if (a.created_at < b.created_at) return -1;
    if (a.created_at > b.created_at) return 1;
    return 0;
  });

  const middleIndex = Math.floor(sortedByCreatedAt.length / 2);
  const middleSession = sortedByCreatedAt[middleIndex];
  const targetCreatedAt = middleSession.created_at;

  // 7) Call sessions.index with createdFrom/createdTo filtering around
  // targetCreatedAt and explicit ordering by created_at desc.
  const filteredRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    createdFrom: targetCreatedAt,
    createdTo: targetCreatedAt,
    orderBy: "created_at" as const,
    orderDirection: "desc" as const,
  } satisfies ITodoAppTodouserSession.IRequest;

  const filtered: IPageITodoAppTodouserSession.ISummary =
    await api.functional.todoApp.todoAdmin.todoUsers.sessions.index(
      connection,
      {
        todoUserId: user.id,
        body: filteredRequestBody,
      },
    );
  typia.assert(filtered);

  const filteredPagination: IPage.IPagination = filtered.pagination;
  const filteredData: ITodoAppTodouserSession.ISummary[] = filtered.data;

  // All returned sessions must belong to the same todoUser and satisfy the
  // created_at time window.
  for (const session of filteredData) {
    TestValidator.equals(
      "filtered session.todoUser.id must match queried todoUserId",
      session.todoUser.id,
      user.id,
    );

    TestValidator.predicate(
      "filtered session.created_at must be >= createdFrom",
      session.created_at >= targetCreatedAt,
    );
    TestValidator.predicate(
      "filtered session.created_at must be <= createdTo",
      session.created_at <= targetCreatedAt,
    );
  }

  // When limit is sufficiently large and the filter is narrow, the number of
  // records should equal the data length on the first page. To satisfy
  // TestValidator.equals typing, use the plain number as the first argument.
  TestValidator.equals(
    "filtered pagination.records should equal filtered data length on first page",
    filteredData.length,
    filteredPagination.records,
  );

  // Validate descending order by created_at
  for (let i = 1; i < filteredData.length; ++i) {
    const prev = filteredData[i - 1];
    const curr = filteredData[i];
    TestValidator.predicate(
      "filtered sessions must be ordered by created_at desc",
      prev.created_at >= curr.created_at,
    );
  }

  // 8) Additional sanity check: pagination.pages consistency on baseline
  const expectedPages =
    baselinePagination.records === 0
      ? 0
      : Math.ceil(baselinePagination.records / baselinePagination.limit);

  TestValidator.equals(
    "baseline pagination.pages should match records/limit",
    expectedPages,
    baselinePagination.pages,
  );
}
