import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering super administrator sessions by active or expired status.
 *
 * Validates that the sessions list endpoint correctly filters sessions based on
 * their expiration status. When status filter is set to 'active', only sessions
 * where expiredAt > current server time are returned. When set to 'expired',
 * only sessions where expiredAt <= current server time are returned.
 *
 * The test verifies that:
 * - The isActive computed flag correctly reflects the session's expiration state
 * - Pagination metadata remains consistent across filtered results
 * - The filter correctly separates active from expired sessions
 *
 * 1. Register a new super administrator account
 * 2. Retrieve sessions without filter to establish baseline
 * 3. Filter sessions by 'active' status
 * 4. Validate all returned sessions have expiredAt > now and isActive = true
 * 5. Filter sessions by 'expired' status
 * 6. Validate all returned sessions have expiredAt <= now and isActive = false
 * 7. Verify pagination metadata consistency
 */
export async function test_api_super_admin_session_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Get baseline sessions (no filter)
  const baseline =
    await api.functional.ecommerceMall.superAdmin.super_admin.sessions.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallSuperAdminSession.IRequest,
      },
    );
  typia.assert(baseline);
  // 3. Filter by 'active' status
  const activeSessions =
    await api.functional.ecommerceMall.superAdmin.super_admin.sessions.index(
      superAdminConnection,
      {
        body: {
          status: "active",
          limit: 100,
        } satisfies IEcommerceMallSuperAdminSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // 4. Validate active sessions have expiredAt > now and isActive = true
  const now = new Date();
  for (const session of activeSessions.data) {
    const expiredAt = new Date(session.expiredAt);
    TestValidator.predicate(
      "active session has expiredAt > now",
      expiredAt.getTime() > now.getTime(),
    );
    TestValidator.equals(
      "active session isActive is true",
      session.isActive,
      true,
    );
  }
  // 5. Filter by 'expired' status
  const expiredSessions =
    await api.functional.ecommerceMall.superAdmin.super_admin.sessions.index(
      superAdminConnection,
      {
        body: {
          status: "expired",
          limit: 100,
        } satisfies IEcommerceMallSuperAdminSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // 6. Validate expired sessions have expiredAt <= now and isActive = false
  for (const session of expiredSessions.data) {
    const expiredAt = new Date(session.expiredAt);
    TestValidator.predicate(
      "expired session has expiredAt <= now",
      expiredAt.getTime() <= now.getTime(),
    );
    TestValidator.equals(
      "expired session isActive is false",
      session.isActive,
      false,
    );
  }
  // 7. Verify pagination metadata consistency
  // The active and expired counts should equal the total baseline count
  TestValidator.equals(
    "active + expired counts match total",
    activeSessions.data.length + expiredSessions.data.length,
    baseline.data.length,
  );
  // Verify pagination structure exists
  TestValidator.predicate(
    "active sessions pagination exists",
    activeSessions.pagination !== undefined,
  );
  TestValidator.predicate(
    "expired sessions pagination exists",
    expiredSessions.pagination !== undefined,
  );
  // Verify pagination metadata consistency
  TestValidator.equals(
    "active pagination limit matches",
    activeSessions.pagination.limit,
    100,
  );
  TestValidator.equals(
    "expired pagination limit matches",
    expiredSessions.pagination.limit,
    100,
  );
}
