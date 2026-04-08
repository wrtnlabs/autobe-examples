import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_guest_session_expired_audit_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(adminConnection, {});
  // 2. Query expired guest sessions using current timestamp filter
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const requestBody = {
    expiredAtFrom: oneDayAgo.toISOString(),
    expiredAtTo: now.toISOString(),
    sortBy: "expired_at" as const,
    sortOrder: "desc" as const,
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallGuestSession.IRequest;
  const expiredSessions =
    await api.functional.ecommerceMall.superAdmin.guest_sessions.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(expiredSessions);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination current page non-negative",
    expiredSessions.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    expiredSessions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    expiredSessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    expiredSessions.pagination.pages >= 0,
  );
  // 4. Verify expired sessions have correct status
  for (const session of expiredSessions.data) {
    // Verify guest status is 'expired'
    TestValidator.equals(
      "guest status is expired",
      session.guest.status,
      "expired",
    );
    // Verify session expiration timestamp is within filter range
    const sessionExpiredAt = new Date(session.expiredAt);
    const currentTime = now.getTime();
    TestValidator.predicate(
      "session expiredAt is not in the future",
      sessionExpiredAt.getTime() <= currentTime,
    );
  }
  // 5. Test pagination by requesting page 2 if data exists
  if (expiredSessions.pagination.pages > 1) {
    const page2Request = {
      ...requestBody,
      page: 2,
    } satisfies IEcommerceMallGuestSession.IRequest;
    const page2Sessions =
      await api.functional.ecommerceMall.superAdmin.guest_sessions.index(
        adminConnection,
        { body: page2Request },
      );
    typia.assert(page2Sessions);
    // Verify page 2 returns valid data
    TestValidator.predicate(
      "page 2 data is valid",
      Array.isArray(page2Sessions.data),
    );
  }
}
