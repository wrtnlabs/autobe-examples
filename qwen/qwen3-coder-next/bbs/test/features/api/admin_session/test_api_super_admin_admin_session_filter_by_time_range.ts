import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator filtering admin sessions by time range.
 * Tests all time range filter combinations, pagination, sorting, and active/inactive status.
 */
export async function test_api_super_admin_admin_session_filter_by_time_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super admin account for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: "superadmin@test.com" + RandomGenerator.alphaNumeric(6),
        password: "TestPassword123!",
        name: "Super Admin Test",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Create new connection with the token from registration
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedConnection.headers = {
    Authorization: superAdmin.token.access,
  };
  // 2. Create multiple test sessions with different timestamps
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(
    now.getTime() - 2 * 60 * 60 * 1000,
  ).toISOString();
  const threeHoursAgo = new Date(
    now.getTime() - 3 * 60 * 60 * 1000,
  ).toISOString();
  const futureTime = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  // 3. Test createdFrom filter only
  const fromFilter =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          createdFrom: twoHoursAgo,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(fromFilter);
  // 4. Test createdTo filter only
  const toFilter =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          createdTo: twoHoursAgo,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(toFilter);
  // 5. Test combined createdFrom and createdTo filters
  const combinedFilter =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          createdFrom: threeHoursAgo,
          createdTo: hourAgo,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // 6. Test expiredFrom filter only
  const expiredFromFilter =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          expiredFrom: hourAgo,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(expiredFromFilter);
  // 7. Test expiredTo filter only
  const expiredToFilter =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          expiredTo: futureTime,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(expiredToFilter);
  // 8. Test combined expiredFrom and expiredTo filters
  const expiredCombinedFilter =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          expiredFrom: hourAgo,
          expiredTo: futureTime,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(expiredCombinedFilter);
  // 9. Test isActive filter - active sessions only
  const activeFilter =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          isActive: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(activeFilter);
  // 10. Test isActive filter - inactive sessions only
  const inactiveFilter =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          isActive: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(inactiveFilter);
  // 11. Test pagination with filtered results
  const paginatedFilter =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          createdFrom: threeHoursAgo,
          createdTo: futureTime,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(paginatedFilter);
  // Validate pagination metadata exists and is correct
  TestValidator.predicate(
    "pagination exists",
    paginatedFilter.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(paginatedFilter.data),
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedFilter.pagination.limit,
    5,
  );
  // 12. Test sorting by created_at ascending
  const sortByCreatedAsc =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(sortByCreatedAsc);
  // 13. Test sorting by created_at descending
  const sortByCreatedDesc =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(sortByCreatedDesc);
  // 14. Test sorting by expired_at ascending
  const sortByExpiredAsc =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          sortBy: "expired_at",
          sortOrder: "asc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(sortByExpiredAsc);
  // 15. Test sorting by ip ascending
  const sortByIpAsc =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          sortBy: "ip",
          sortOrder: "asc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(sortByIpAsc);
  // 16. Test boundary conditions - exact timestamp for createdFrom (should be inclusive)
  const boundaryFrom =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          createdFrom: twoHoursAgo,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(boundaryFrom);
  // 17. Test boundary conditions - exact timestamp for createdTo (should be exclusive)
  const boundaryTo =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          createdTo: twoHoursAgo,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(boundaryTo);
  // 18. Test empty result set handling
  const noResults =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          createdFrom: futureTime, // Future date should return no results
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(noResults);
  TestValidator.equals("empty result set", noResults.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    noResults.pagination.records,
    0,
  );
  // 19. Test filtering by specific admin ID
  const adminFilter =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          adminId: superAdmin.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(adminFilter);
  // 20. Test filtering by IP address
  const ipFilter =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          ip: "127.0.0.1",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(ipFilter);
  // 21. Test combined filters with multiple conditions
  const combinedMultiFilter =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          adminId: superAdmin.id,
          createdFrom: threeHoursAgo,
          createdTo: futureTime,
          isActive: true,
          sortBy: "created_at",
          sortOrder: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(combinedMultiFilter);
  // 22. Verify returned session structure
  if (combinedMultiFilter.data.length > 0) {
    const sampleSession = combinedMultiFilter.data[0];
    typia.assert<IDiscussionBoardAdminSession.ISummary>(sampleSession);
    // Verify session has required properties
    TestValidator.predicate(
      "session has id",
      typeof sampleSession.id === "string",
    );
    TestValidator.predicate(
      "session has ip",
      typeof sampleSession.ip === "string",
    );
    TestValidator.predicate(
      "session has href",
      typeof sampleSession.href === "string",
    );
    TestValidator.predicate(
      "session has created_at",
      typeof sampleSession.created_at === "string",
    );
    TestValidator.predicate(
      "session has expired_at",
      typeof sampleSession.expired_at === "string",
    );
    TestValidator.predicate(
      "session has admin",
      sampleSession.admin !== undefined,
    );
  }
  // 23. Verify active/inactive status is correctly identified
  const activeSessions =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          isActive: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  const inactiveSessions =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          isActive: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  typia.assert(inactiveSessions);
  // Verify all active sessions have expired_at > now
  for (const session of activeSessions.data) {
    TestValidator.predicate(
      "session is active",
      new Date(session.expired_at).getTime() > now.getTime(),
    );
  }
  // Verify all inactive sessions have expired_at <= now
  for (const session of inactiveSessions.data) {
    TestValidator.predicate(
      "session is inactive",
      new Date(session.expired_at).getTime() <= now.getTime(),
    );
  }
  // 24. Test sorting with filtered results
  const sortedFiltered =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      authenticatedConnection,
      {
        body: {
          createdFrom: threeHoursAgo,
          createdTo: futureTime,
          sortBy: "expired_at",
          sortOrder: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(sortedFiltered);
}
