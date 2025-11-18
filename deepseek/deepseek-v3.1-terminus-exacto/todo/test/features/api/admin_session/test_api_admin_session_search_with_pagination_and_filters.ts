import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Verifies that an authenticated admin can search their own login sessions
 * using various filters (IP address, URL, referrer, date ranges) and receive a
 * paginated result. Ensures that only sessions for the correct admin are
 * retrieved and privileged actors cannot access sessions for other admins.
 * Checks audit use cases such as filtering by expired state and navigating
 * across result pages. Expected outcome: only valid session records for the
 * authenticated admin are returned, with correct pagination and filter
 * behavior.
 */
export async function test_api_admin_session_search_with_pagination_and_filters(
  connection: api.IConnection,
) {
  // 1. Register two admins
  const adminA_email = typia.random<string & tags.Format<"email">>();
  const adminB_email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const adminA = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminA_email,
      password,
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(adminA);
  const adminA_id = adminA.id;
  const adminB = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminB_email,
      password,
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(adminB);
  const adminB_id = adminB.id;

  // 2. Query sessions (first-page, default filter) for adminA
  const defaultSearch: ITodoListAdminSession.IRequest = {};
  const page1 = await api.functional.todoList.admin.admins.sessions.index(
    connection,
    {
      adminId: adminA_id,
      body: defaultSearch,
    },
  );
  typia.assert(page1);
  TestValidator.predicate(
    "sessions only belong to adminA",
    page1.data.every((sess) => sess.admin.id === adminA_id),
  );

  // 3. Pagination: fetch with small limit, get page 2 to check cursoring
  const paginationBody: ITodoListAdminSession.IRequest = { limit: 1, page: 2 };
  const page2 = await api.functional.todoList.admin.admins.sessions.index(
    connection,
    {
      adminId: adminA_id,
      body: paginationBody,
    },
  );
  typia.assert(page2);
  TestValidator.equals("limit applied for page 2", page2.pagination.limit, 1);
  TestValidator.equals("current page is 2", page2.pagination.current, 2);

  // 4. Filtering by IP (use IP from a real session if available)
  const firstSession = page1.data[0];
  if (firstSession) {
    const ipFilterBody: ITodoListAdminSession.IRequest = {
      ip: firstSession.ip,
    };
    const filteredByIP =
      await api.functional.todoList.admin.admins.sessions.index(connection, {
        adminId: adminA_id,
        body: ipFilterBody,
      });
    typia.assert(filteredByIP);
    TestValidator.predicate(
      "all filtered sessions IP match",
      filteredByIP.data.every((sess) => sess.ip === firstSession.ip),
    );
  }

  // 5. Filtering by href
  if (firstSession) {
    const hrefFilterBody: ITodoListAdminSession.IRequest = {
      href: firstSession.href,
    };
    const filteredByHref =
      await api.functional.todoList.admin.admins.sessions.index(connection, {
        adminId: adminA_id,
        body: hrefFilterBody,
      });
    typia.assert(filteredByHref);
    TestValidator.predicate(
      "all filtered sessions href match",
      filteredByHref.data.every((sess) => sess.href === firstSession.href),
    );
  }
  // 6. Filtering by referrer
  if (firstSession) {
    const referrerFilterBody: ITodoListAdminSession.IRequest = {
      referrer: firstSession.referrer,
    };
    const filteredByReferrer =
      await api.functional.todoList.admin.admins.sessions.index(connection, {
        adminId: adminA_id,
        body: referrerFilterBody,
      });
    typia.assert(filteredByReferrer);
    TestValidator.predicate(
      "all filtered sessions referrer match",
      filteredByReferrer.data.every(
        (sess) => sess.referrer === firstSession.referrer,
      ),
    );
  }

  // 7. Filtering by created_at window
  if (firstSession) {
    // Use a window covering only the session's creation time
    const from = firstSession.created_at;
    const to = firstSession.created_at;
    const timeFilterBody: ITodoListAdminSession.IRequest = {
      created_at_from: from,
      created_at_to: to,
    };
    const filteredByCreatedAt =
      await api.functional.todoList.admin.admins.sessions.index(connection, {
        adminId: adminA_id,
        body: timeFilterBody,
      });
    typia.assert(filteredByCreatedAt);
    TestValidator.predicate(
      "all filtered sessions are in the time window",
      filteredByCreatedAt.data.every((sess) => sess.created_at === from),
    );
  }
  // 8. Filtering by expired (test only returns sessions with expired_at !== null)
  const expiredFilterBody: ITodoListAdminSession.IRequest = { expired: true };
  const filteredByExpired =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: adminA_id,
      body: expiredFilterBody,
    });
  typia.assert(filteredByExpired);
  TestValidator.predicate(
    "all filtered sessions are expired",
    filteredByExpired.data.every(
      (sess) => sess.expired_at !== null && sess.expired_at !== undefined,
    ),
  );

  // 9. Negative test: try to get adminB sessions as adminA
  await TestValidator.error(
    "adminA cannot access sessions of adminB",
    async () => {
      await api.functional.todoList.admin.admins.sessions.index(connection, {
        adminId: adminB_id,
        body: {},
      });
    },
  );
}
