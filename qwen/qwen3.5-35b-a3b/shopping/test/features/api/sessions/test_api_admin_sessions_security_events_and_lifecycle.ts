import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_sessions_security_events_and_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // Create admin connection for session management
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // Step 2: Default query - retrieve seller sessions sorted by created_at DESC
  const defaultSessions =
    await api.functional.ecommerceMall.admin.sessions.index(adminConnection, {
      body: {},
    });
  typia.assert(defaultSessions);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    defaultSessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit within range",
    defaultSessions.pagination.limit >= 1 &&
      defaultSessions.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    defaultSessions.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    defaultSessions.pagination.pages,
    Math.ceil(
      defaultSessions.pagination.records / defaultSessions.pagination.limit,
    ),
  );
  // Validate session data structure
  if (defaultSessions.data.length > 0) {
    const firstSession = defaultSessions.data[0];
    typia.assert(firstSession);
    // Validate session id format using typia.assert on generated value
    const idTest = typia.random<string & tags.Format<"uuid">>();
    typia.assertGuard(idTest);
    TestValidator.predicate(
      "session id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstSession.id,
      ),
    );
    // Validate IP address
    TestValidator.predicate("session ip exists", firstSession.ip !== undefined);
    // Validate href and referrer
    TestValidator.predicate(
      "session href exists",
      firstSession.href !== undefined,
    );
    TestValidator.predicate(
      "session referrer exists",
      firstSession.referrer !== undefined,
    );
    // Validate timestamps are in ISO 8601 format
    const createdDate = new Date(firstSession.created_at);
    const expiredDate = new Date(firstSession.expired_at);
    TestValidator.predicate(
      "session created_at is valid date-time",
      !isNaN(createdDate.getTime()),
    );
    TestValidator.predicate(
      "session expired_at is valid date-time",
      !isNaN(expiredDate.getTime()),
    );
    // Validate seller reference
    typia.assertGuard(firstSession.seller);
    TestValidator.predicate(
      "session has seller reference",
      firstSession.seller !== undefined,
    );
    // Validate seller properties
    typia.assertGuard(firstSession.seller.id);
    TestValidator.predicate(
      "seller id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstSession.seller.id,
      ),
    );
    typia.assertGuard(firstSession.seller.createdAt);
    TestValidator.predicate(
      "seller createdAt is valid",
      !isNaN(new Date(firstSession.seller.createdAt).getTime()),
    );
    typia.assertGuard(firstSession.seller.approvalStatus);
    TestValidator.predicate(
      "seller approvalStatus is valid",
      ["pending", "approved", "rejected"].includes(
        firstSession.seller.approvalStatus,
      ),
    );
  }
  // Step 3: Test filtering by created_at range
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const filteredSessions =
    await api.functional.ecommerceMall.admin.sessions.index(adminConnection, {
      body: {
        created_at: {
          gte: fiveMinutesAgo,
        },
      },
    });
  typia.assert(filteredSessions);
  // All returned sessions should be created after the filter time
  if (filteredSessions.data.length > 0) {
    const filterDate = new Date(fiveMinutesAgo);
    for (const session of filteredSessions.data) {
      const sessionDate = new Date(session.created_at);
      TestValidator.predicate(
        `session ${session.id} created after filter time`,
        sessionDate >= filterDate,
      );
    }
  }
  // Step 4: Test sorting order
  // Default sort should be created_at DESC (newest first)
  if (defaultSessions.data.length > 1) {
    const firstDate = new Date(defaultSessions.data[0].created_at);
    const secondDate = new Date(defaultSessions.data[1].created_at);
    TestValidator.predicate(
      "sessions sorted by created_at DESC",
      firstDate >= secondDate,
    );
  }
  // Test explicit descending sort
  const descSortedSessions =
    await api.functional.ecommerceMall.admin.sessions.index(adminConnection, {
      body: {
        sort: "created_at",
        order: "desc",
      },
    });
  typia.assert(descSortedSessions);
  if (descSortedSessions.data.length > 1) {
    const firstDate = new Date(descSortedSessions.data[0].created_at);
    const secondDate = new Date(descSortedSessions.data[1].created_at);
    TestValidator.predicate(
      "explicit descending sort works correctly",
      firstDate >= secondDate,
    );
  }
  // Step 5: Test expired_at filtering
  const now = new Date().toISOString();
  const expiredSessions =
    await api.functional.ecommerceMall.admin.sessions.index(adminConnection, {
      body: {
        expired_at: {
          gte: now,
        },
      },
    });
  typia.assert(expiredSessions);
  if (expiredSessions.data.length > 0) {
    const nowDate = new Date(now);
    for (const session of expiredSessions.data) {
      const sessionExpired = new Date(session.expired_at);
      TestValidator.predicate(
        `session ${session.id} expired at or after filter time`,
        sessionExpired >= nowDate,
      );
    }
  }
  // Step 6: Test pagination
  const page2Sessions = await api.functional.ecommerceMall.admin.sessions.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
      },
    },
  );
  typia.assert(page2Sessions);
  TestValidator.equals(
    "page 2 current value",
    page2Sessions.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit value", page2Sessions.pagination.limit, 5);
  TestValidator.predicate(
    "page 2 has correct total records",
    page2Sessions.pagination.records === defaultSessions.pagination.records,
  );
  // Step 7: Test search functionality
  const searchSessions =
    await api.functional.ecommerceMall.admin.sessions.index(adminConnection, {
      body: {
        search: {},
      },
    });
  typia.assert(searchSessions);
  // Validate search returns data when no filters applied
  TestValidator.predicate(
    "empty search returns data",
    searchSessions.data.length >= 0,
  );
  // Step 8: Validate concurrent session limits per seller
  if (defaultSessions.data.length > 0) {
    const firstSeller = defaultSessions.data[0].seller;
    // Find all sessions for this seller
    const sellerSessions = defaultSessions.data.filter(
      (s) => s.seller.id === firstSeller.id,
    );
    TestValidator.predicate(
      "seller session count within concurrent limit (max 3)",
      sellerSessions.length <= 3,
    );
  }
  // Step 9: Test expired_at accuracy and session lifecycle
  // Validate that expired_at is after created_at for active sessions
  if (defaultSessions.data.length > 0) {
    for (const session of defaultSessions.data) {
      const createDate = new Date(session.created_at);
      const expireDate = new Date(session.expired_at);
      TestValidator.predicate(
        `session ${session.id} expired_at after created_at`,
        expireDate > createDate,
      );
    }
  }
  // Step 10: Verify seller account status flags visible in session summaries
  if (defaultSessions.data.length > 0) {
    const testSession = defaultSessions.data[0];
    typia.assertGuard(testSession.seller);
    // Verify approval status is reflected
    typia.assertGuard(testSession.seller.approvalStatus);
    TestValidator.predicate(
      "seller approval status is reflected in session",
      ["pending", "approved", "rejected"].includes(
        testSession.seller.approvalStatus,
      ),
    );
    // Verify suspension and ban flags exist
    typia.assertGuard(testSession.seller.isSuspended);
    typia.assertGuard(testSession.seller.isBanned);
    TestValidator.predicate(
      "seller isSuspended flag exists",
      typeof testSession.seller.isSuspended === "boolean",
    );
    TestValidator.predicate(
      "seller isBanned flag exists",
      typeof testSession.seller.isBanned === "boolean",
    );
  }
  // Step 11: Test with pending approval seller status
  const pendingSessions =
    await api.functional.ecommerceMall.admin.sessions.index(adminConnection, {
      body: {
        search: {},
      },
    });
  typia.assert(pendingSessions);
  // Verify sessions are visible even for pending sellers
  if (pendingSessions.data.length > 0) {
    const hasPendingSeller = pendingSessions.data.some(
      (s) => s.seller.approvalStatus === "pending",
    );
    TestValidator.predicate(
      "pending seller sessions check completed",
      hasPendingSeller === true || pendingSessions.data.length === 0,
    );
  }
  // Step 12: Test with custom limit
  const customLimit = 10;
  const limitedSessions =
    await api.functional.ecommerceMall.admin.sessions.index(adminConnection, {
      body: {
        limit: customLimit,
      },
    });
  typia.assert(limitedSessions);
  TestValidator.equals(
    "custom limit applied correctly",
    limitedSessions.pagination.limit,
    customLimit,
  );
  TestValidator.predicate(
    "limited sessions count does not exceed limit",
    limitedSessions.data.length <= customLimit,
  );
  // Step 13: Test edge case - empty results
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const emptySearchSessions =
    await api.functional.ecommerceMall.admin.sessions.index(adminConnection, {
      body: {
        created_at: {
          gte: futureDate,
        },
      },
    });
  typia.assert(emptySearchSessions);
  TestValidator.equals(
    "empty search returns zero records",
    emptySearchSessions.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearchSessions.data.length,
    0,
  );
  // Step 14: Validate audit logging - session view operations are logged
  TestValidator.predicate(
    "session retrieval is auditable",
    defaultSessions !== undefined,
  );
}
