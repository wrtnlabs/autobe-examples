import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUser";
import type { IPageITodoAppMemberUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUserSession";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserSession";

export async function test_api_admin_memberuser_sessions_list_empty_result_for_member_without_sessions(
  connection: api.IConnection,
) {
  // 1. Register an admin user and establish an authenticated admin context
  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: typia.random<ITodoAppAdminUser.IJoin>(),
    });
  typia.assert(adminAuthorized);

  // 2. Query member users to obtain a real memberUserId to test with
  const memberUsersPage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies ITodoAppMemberUser.IRequest,
    });
  typia.assert(memberUsersPage);

  // Guard: ensure we have at least one member user to run the test against
  TestValidator.predicate(
    "there is at least one member user to test sessions listing",
    memberUsersPage.data.length > 0,
  );

  const targetMember = memberUsersPage.data[0];
  typia.assert<ITodoAppMemberUser.ISummary>(targetMember);

  // 3. Initial call to sessions listing for the chosen member, page=1
  const firstSessionsPage: IPageITodoAppMemberUserSession.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.sessions.index(
      connection,
      {
        memberUserId: targetMember.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies ITodoAppMemberUserSession.IRequest,
      },
    );
  typia.assert(firstSessionsPage);

  const initialPagination = firstSessionsPage.pagination;
  const initialRecords = initialPagination.records;
  const initialLimit = initialPagination.limit;

  // 4. Compute an out-of-range page that must yield an empty result
  const effectiveLimit = initialLimit === 0 ? 1 : initialLimit;
  const lastPage =
    initialRecords === 0 ? 0 : Math.ceil(initialRecords / effectiveLimit);
  const outOfRangePage = lastPage + 2;

  // 5. Request the out-of-range page for the same member user sessions
  const emptySessionsPage: IPageITodoAppMemberUserSession.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.sessions.index(
      connection,
      {
        memberUserId: targetMember.id,
        body: {
          page: outOfRangePage,
          limit: effectiveLimit,
        } satisfies ITodoAppMemberUserSession.IRequest,
      },
    );
  typia.assert(emptySessionsPage);

  const emptyPagination = emptySessionsPage.pagination;

  // 6. Validate pagination metadata matches the requested page and limit
  TestValidator.equals(
    "pagination.current should equal requested out-of-range page",
    emptyPagination.current,
    outOfRangePage,
  );

  TestValidator.equals(
    "pagination.limit should equal requested limit",
    emptyPagination.limit,
    effectiveLimit,
  );

  // 7. Validate that data is empty for out-of-range page
  TestValidator.equals(
    "out-of-range sessions listing should return empty data array",
    emptySessionsPage.data.length,
    0,
  );

  // 8. Validate records count remains consistent with initial query
  TestValidator.equals(
    "total records count should remain consistent across pages",
    emptyPagination.records,
    initialRecords,
  );

  // 9. Validate pages is the ceiling of records/limit and non-negative
  const expectedPages =
    initialRecords === 0 ? 0 : Math.ceil(initialRecords / effectiveLimit);

  TestValidator.equals(
    "pages should be consistent with records and limit",
    emptyPagination.pages,
    expectedPages,
  );

  TestValidator.predicate(
    "pagination.pages must be non-negative",
    emptyPagination.pages >= 0,
  );
}
