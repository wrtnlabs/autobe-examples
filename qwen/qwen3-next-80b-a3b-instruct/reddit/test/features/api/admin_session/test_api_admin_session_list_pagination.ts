import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminSession";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_session_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to create session
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create 15 additional admin sessions via join (each join creates a session)
  const sessionsToCreate = 15;
  for (let i = 0; i < sessionsToCreate; i++) {
    const newAdminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(newAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  }
  // Step 3: Get total count of sessions (should be 16 including the first)
  const totalResponse =
    await api.functional.communityPlatform.admin.admin.sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(totalResponse);
  const totalCount = totalResponse.pagination.records;
  TestValidator.equals("total sessions count", totalCount, 16);
  // Step 4: Test pagination - page 1, limit 5
  const page1 =
    await api.functional.communityPlatform.admin.admin.sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 data count", page1.data.length, 5);
  // Step 5: Test pagination - page 2, limit 5
  const page2 =
    await api.functional.communityPlatform.admin.admin.sessions.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 data count", page2.data.length, 5);
  // Step 6: Validate no overlap between pages
  const page1Ids = new Set(page1.data.map((s) => s.id));
  const page2Ids = new Set(page2.data.map((s) => s.id));
  for (const id of page1Ids) {
    TestValidator.predicate(
      "no overlap between pages",
      () => !page2Ids.has(id),
    );
  }
  // Step 7: Test sorting by authTime ascending
  const authTimeAsc =
    await api.functional.communityPlatform.admin.admin.sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "authTime",
          sortOrder: "asc",
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(authTimeAsc);
  // Validate ascending authTime order
  for (let i = 0; i < authTimeAsc.data.length - 1; i++) {
    const current = new Date(authTimeAsc.data[i].authAt);
    const next = new Date(authTimeAsc.data[i + 1].authAt);
    TestValidator.predicate("authTime ascending", () => current <= next);
  }
  // Step 8: Test sorting by expireTime descending
  const expireTimeDesc =
    await api.functional.communityPlatform.admin.admin.sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "expireTime",
          sortOrder: "desc",
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(expireTimeDesc);
  // Validate descending expireTime order
  for (let i = 0; i < expireTimeDesc.data.length - 1; i++) {
    const current = new Date(expireTimeDesc.data[i].expiresAt);
    const next = new Date(expireTimeDesc.data[i + 1].expiresAt);
    TestValidator.predicate("expireTime descending", () => current >= next);
  }
  // Step 9: Test sorting by duration ascending
  const durationAsc =
    await api.functional.communityPlatform.admin.admin.sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "duration",
          sortOrder: "asc",
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(durationAsc);
  // Validate ascending duration order
  for (let i = 0; i < durationAsc.data.length - 1; i++) {
    TestValidator.predicate(
      "duration ascending",
      () => durationAsc.data[i].duration <= durationAsc.data[i + 1].duration,
    );
  }
  // Step 10: Test filtering by isActive=true
  const activeSessions =
    await api.functional.communityPlatform.admin.admin.sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          isActive: true,
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // Validate all returned sessions are active
  for (const session of activeSessions.data) {
    TestValidator.equals("active session status", session.authStatus, "active");
  }
  // Step 11: Test filtering by isActive=false
  const inactiveSessions =
    await api.functional.communityPlatform.admin.admin.sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          isActive: false,
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(inactiveSessions);
  // Validate all returned sessions are either expired or revoked
  for (const session of inactiveSessions.data) {
    TestValidator.predicate(
      "inactive session status",
      () =>
        session.authStatus === "expired" || session.authStatus === "revoked",
    );
  }
  // Step 12: Validate data integrity and structure
  if (totalResponse.data.length > 0) {
    const sampleSession = totalResponse.data[0];
    TestValidator.equals("id format", typeof sampleSession.id, "string");
    TestValidator.equals(
      "adminId format",
      typeof sampleSession.adminId,
      "string",
    );
    TestValidator.predicate("authStatus valid", () =>
      ["active", "expired", "revoked"].includes(sampleSession.authStatus),
    );
    TestValidator.equals(
      "sessionId format",
      typeof sampleSession.sessionId,
      "string",
    );
    TestValidator.equals(
      "authAt format",
      typeof sampleSession.authAt,
      "string",
    );
    TestValidator.equals(
      "expiresAt format",
      typeof sampleSession.expiresAt,
      "string",
    );
    TestValidator.equals(
      "duration type",
      typeof sampleSession.duration,
      "number",
    );
    TestValidator.predicate(
      "duration non-negative",
      () => sampleSession.duration >= 0,
    );
    TestValidator.equals(
      "userAgent format",
      typeof sampleSession.userAgent,
      "string",
    );
    TestValidator.equals(
      "sessionType format",
      typeof sampleSession.sessionType,
      "string",
    );
    TestValidator.equals(
      "totalRequests type",
      typeof sampleSession.totalRequests,
      "number",
    );
    TestValidator.predicate(
      "totalRequests non-negative",
      () => sampleSession.totalRequests >= 0,
    );
    TestValidator.equals(
      "lastActivityAt format",
      typeof sampleSession.lastActivityAt,
      "string",
    );
    TestValidator.equals(
      "createdAt format",
      typeof sampleSession.createdAt,
      "string",
    );
  }
  // Step 13: Validate pagination totals
  TestValidator.equals(
    "total records match",
    totalResponse.pagination.records,
    totalCount,
  );
  TestValidator.equals(
    "total pages calculation",
    totalResponse.pagination.pages,
    Math.ceil(totalResponse.pagination.records / 10),
  );
  // Step 14: Validate that ordering and filters work together
  const activeAndSorted =
    await api.functional.communityPlatform.admin.admin.sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "authTime",
          sortOrder: "asc",
          isActive: true,
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(activeAndSorted);
  // Validate headers work - combining sort and filter
  if (activeAndSorted.data.length > 0) {
    TestValidator.equals(
      "active session has active status",
      activeAndSorted.data[0].authStatus,
      "active",
    );
    // Verify sorted by authTime ascending
    for (let i = 0; i < activeAndSorted.data.length - 1; i++) {
      const current = new Date(activeAndSorted.data[i].authAt);
      const next = new Date(activeAndSorted.data[i + 1].authAt);
      TestValidator.predicate(
        "active sessions sorted by authTime ascending",
        () => current <= next,
      );
    }
  }
}
