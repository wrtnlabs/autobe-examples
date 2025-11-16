import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test pagination navigation through user activity history
 *
 * Creates comprehensive session history through login operations, tests
 * pagination across multiple page sizes (5, 10, 25 items), validates pagination
 * metadata accuracy, ensures data consistency across different requests, and
 * verifies proper ordering. Also tests edge cases like requesting pages beyond
 * available data.
 */
export async function test_api_user_activity_page_navigation(
  connection: api.IConnection,
) {
  // Step 1: Create user account
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "SecurePassword123",
      href: "https://todo-app.example.com",
      referrer: "https://login.example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create comprehensive session history through multiple logins
  const sessionCount = 25;
  const sessions: ITodoAppUser.IAuthorized[] = [];

  await ArrayUtil.asyncRepeat(sessionCount, async (index) => {
    // Create new connection for each session to simulate fresh logins
    const sessionConnection: api.IConnection = { ...connection, headers: {} };

    const login = await api.functional.auth.user.login(sessionConnection, {
      body: {
        email,
        password: "SecurePassword123",
        href: `https://page-${index}.example.com`,
        referrer: `https://prev-page-${index}.example.com`,
        ip: `192.168.1.${index + 100}`,
      } satisfies ITodoAppUser.ILogin,
    });

    sessions.push(login);
    typia.assert(login);
  });

  // Step 3: Verify actual session count from pagination
  const page1 = await api.functional.todoApp.user.auth.users.activity.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 50,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(page1);

  TestValidator.predicate(
    "session count matches expected",
    page1.pagination.records === sessionCount,
  );

  // Step 4: Test pagination with page size 10
  const pageSize10 = 10;
  const page1With10 =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: pageSize10,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(page1With10);

  TestValidator.predicate(
    "page 1 pagination metadata correct",
    page1With10.pagination.current === 1 &&
      page1With10.pagination.limit === pageSize10 &&
      page1With10.pagination.records === sessionCount &&
      page1With10.pagination.pages === 3,
  );

  TestValidator.predicate(
    "page 1 has correct item count",
    page1With10.data.length === pageSize10,
  );

  // Step 5: Test second page
  const page2With10 =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 2,
        limit: pageSize10,
      },
    });
  typia.assert(page2With10);

  TestValidator.predicate(
    "page 2 metadata correct",
    page2With10.pagination.current === 2 &&
      page2With10.pagination.limit === pageSize10 &&
      page2With10.pagination.records === sessionCount,
  );

  TestValidator.predicate(
    "page 2 has correct item count",
    page2With10.data.length === pageSize10,
  );

  // Step 6: Test last page (partial)
  const page3With10 =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 3,
        limit: pageSize10,
      },
    });
  typia.assert(page3With10);

  TestValidator.predicate(
    "page 3 metadata correct",
    page3With10.pagination.current === 3 &&
      page3With10.pagination.limit === pageSize10,
  );

  TestValidator.predicate(
    "page 3 has remaining 5 items",
    page3With10.data.length === 5,
  );

  // Step 7: Test smaller page size 5
  const pageSize5 = 5;
  const page1With5 =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: pageSize5,
      },
    });
  typia.assert(page1With5);

  TestValidator.predicate(
    "page size 5 calculates correct total pages",
    page1With5.pagination.pages === 5,
  );

  TestValidator.predicate(
    "page 1 with size 5 has correct items",
    page1With5.data.length === pageSize5,
  );

  // Step 8: Test session ordering - should be newest first
  const latestSession =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 5,
      },
    });
  typia.assert(latestSession);

  TestValidator.predicate(
    "latest session is most recent by timestamp order",
    latestSession.data[0].created_at >= latestSession.data[1].created_at,
  );

  // Step 9: Test consistency - same page requests return identical results
  const page1Repeat =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(page1Repeat);

  TestValidator.equals(
    "pagination metadata identical on repeated requests",
    page1With10.pagination,
    page1Repeat.pagination,
  );

  TestValidator.equals(
    "same number of items on repeated requests",
    page1With10.data.length,
    page1Repeat.data.length,
  );

  // Step 10: Test edge case - page beyond available data
  const pageBeyond =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 100,
        limit: 10,
      },
    });
  typia.assert(pageBeyond);

  TestValidator.predicate(
    "page beyond data returns empty array",
    pageBeyond.data.length === 0,
  );

  TestValidator.predicate(
    "page beyond data shows correct metadata",
    pageBeyond.pagination.current === 100 &&
      pageBeyond.pagination.pages === 3 &&
      pageBeyond.pagination.records === sessionCount,
  );

  // Step 11: Test session filtering with date ranges
  const startDate = new Date(Date.now() - 86400000).toISOString(); // 24 hours ago
  const endDate = new Date().toISOString();

  const filteredActivities =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 50,
        created_at_start: startDate,
        created_at_end: endDate,
      },
    });
  typia.assert(filteredActivities);

  TestValidator.predicate(
    "date filtering includes sessions within range",
    filteredActivities.pagination.records === sessionCount,
  );
}
