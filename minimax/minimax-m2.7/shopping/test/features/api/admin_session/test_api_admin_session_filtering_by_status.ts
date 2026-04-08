import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering admin sessions by status (active vs expired).
 *
 * Validates the session filtering functionality by creating multiple admin sessions
 * through repeated login operations and then verifying that the status filter correctly
 * separates active sessions (not yet expired) from expired sessions. The test ensures
 * that filtering by 'active' returns only sessions where expiredAt > NOW() with
 * isActive=true, while filtering by 'expired' returns sessions where expiredAt <= NOW()
 * with isActive=false. The combined count of both filtered results must equal the
 * total session count.
 *
 * 1. Register an admin account using authorize_admin_join with explicit password.
 * 2. Create 3 additional sessions by calling authorize_admin_login repeatedly.
 * 3. Call PATCH /admin/admin/sessions with status='active' filter.
 * 4. Validate all returned sessions have isActive=true and expiredAt > current time.
 * 5. Call PATCH /admin/admin/sessions with status='expired' filter.
 * 6. Validate all returned sessions have isActive=false and expiredAt <= current time.
 * 7. Verify combined record count equals total session count from pagination.
 */
export async function test_api_admin_session_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register an admin with explicit password for later login
  const adminConnection: api.IConnection = { host: connection.host };
  const testPassword = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      password: testPassword,
    },
  });
  typia.assert(authorized);
  // 2. Create additional sessions by logging in multiple times
  const sessionCount = 3;
  await ArrayUtil.asyncRepeat(sessionCount, async () => {
    const loginConnection: api.IConnection = { host: connection.host };
    await authorize_admin_login(loginConnection, {
      body: {
        email: authorized.email,
        password: testPassword,
        href: "https://example.com/admin",
        referrer: "https://example.com/login",
      } satisfies IEcommerceMallAdmin.ILogin,
    });
  });
  // 3. Get total session count (no filter)
  const allSessions =
    await api.functional.ecommerceMall.admin.admin.sessions.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallAdminSession.IRequest,
      },
    );
  typia.assert(allSessions);
  const totalRecords = allSessions.pagination.records;
  TestValidator.equals(
    "total sessions created",
    totalRecords,
    sessionCount + 1,
  );
  // 4. Filter by 'active' status
  const activeSessions =
    await api.functional.ecommerceMall.admin.admin.sessions.index(
      adminConnection,
      {
        body: {
          status: "active",
        } satisfies IEcommerceMallAdminSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  const now = new Date();
  for (const session of activeSessions.data) {
    TestValidator.predicate(
      "active session has isActive=true",
      session.isActive === true,
    );
    const expiredAt = new Date(session.expiredAt);
    TestValidator.predicate("active session expiredAt > NOW", expiredAt > now);
  }
  // 5. Filter by 'expired' status
  const expiredSessions =
    await api.functional.ecommerceMall.admin.admin.sessions.index(
      adminConnection,
      {
        body: {
          status: "expired",
        } satisfies IEcommerceMallAdminSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  for (const session of expiredSessions.data) {
    TestValidator.predicate(
      "expired session has isActive=false",
      session.isActive === false,
    );
    const expiredAt = new Date(session.expiredAt);
    TestValidator.predicate(
      "expired session expiredAt <= NOW",
      expiredAt <= now,
    );
  }
  // 6. Verify combined results match total
  const combinedCount =
    activeSessions.pagination.records + expiredSessions.pagination.records;
  TestValidator.equals(
    "combined count matches total",
    combinedCount,
    totalRecords,
  );
}
