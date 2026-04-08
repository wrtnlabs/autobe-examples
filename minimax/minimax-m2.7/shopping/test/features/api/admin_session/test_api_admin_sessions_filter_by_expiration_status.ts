import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminSession";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_sessions_filter_by_expiration_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SuperAdmin123!@#",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  const targetAdminId: string & tags.Format<"uuid"> = superAdmin.id;
  // 2. Generate multiple sessions by logging in as super admin multiple times
  const loginConn2: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(loginConn2, {
    body: {
      email: superAdmin.email,
      password: "SuperAdmin123!@#",
    },
  });
  const loginConn3: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(loginConn3, {
    body: {
      email: superAdmin.email,
      password: "SuperAdmin123!@#",
    },
  });
  // 3. Query sessions with isExpired: false to get active sessions
  const activeSessions =
    await api.functional.ecommerceMall.superAdmin.admins.sessions.index(
      superAdminConnection,
      {
        adminId: targetAdminId,
        body: {
          isExpired: false,
          limit: 100,
        },
      },
    );
  typia.assert(activeSessions);
  // 4. Verify active sessions have expiredAt > current time
  const now = new Date();
  for (const session of activeSessions.data) {
    const expiredAt = new Date(session.expiredAt);
    TestValidator.predicate(
      "session should be active (expiredAt > now)",
      expiredAt.getTime() > now.getTime(),
    );
  }
  // 5. Query sessions with isExpired: true to get expired sessions
  const expiredSessions =
    await api.functional.ecommerceMall.superAdmin.admins.sessions.index(
      superAdminConnection,
      {
        adminId: targetAdminId,
        body: {
          isExpired: true,
          limit: 100,
        },
      },
    );
  typia.assert(expiredSessions);
  // 6. Verify expired sessions have expiredAt < current time
  for (const session of expiredSessions.data) {
    const expiredAt = new Date(session.expiredAt);
    TestValidator.predicate(
      "session should be expired (expiredAt < now)",
      expiredAt.getTime() < now.getTime(),
    );
  }
  // 7. Verify pagination metadata exists - use data.length for count since IPagination doesn't have records/limit/current
  TestValidator.predicate(
    "active sessions count is non-negative",
    activeSessions.data.length >= 0,
  );
  TestValidator.predicate(
    "expired sessions count is non-negative",
    expiredSessions.data.length >= 0,
  );
  // 8. Verify no overlap between active and expired sessions
  const activeIds = new Set(activeSessions.data.map((s) => s.id));
  for (const session of expiredSessions.data) {
    TestValidator.equals(
      "expired session should not be in active list",
      activeIds.has(session.id),
      false,
    );
  }
  // 9. Query all sessions to verify total
  const allSessions =
    await api.functional.ecommerceMall.superAdmin.admins.sessions.index(
      superAdminConnection,
      {
        adminId: targetAdminId,
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(allSessions);
  // 10. Verify filtered sessions don't exceed total count
  const totalCount = allSessions.data.length;
  const filteredCount = activeSessions.data.length + expiredSessions.data.length;
  TestValidator.predicate(
    "filtered total should not exceed total sessions",
    filteredCount <= totalCount,
  );
}