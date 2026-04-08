import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminSession";
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

export async function test_api_admin_session_filter_by_admin_and_expiration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "super_admin",
      reason: RandomGenerator.paragraph({ sentences: 5 }),
      href: "https://example.com/page" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Filter sessions by isExpired: false (active sessions only)
  const activeSessions =
    await api.functional.ecommerceMall.admin.admin.sessions.index(
      adminConnection,
      {
        body: {
          isExpired: false,
          limit: 100,
        } satisfies IEcommerceMallAdminSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // 3. Validate all returned active sessions are indeed active
  const now = new Date();
  for (const session of activeSessions.data) {
    const expiredAt = new Date(session.expiredAt);
    TestValidator.predicate(
      "session should be active when isExpired=false",
      expiredAt > now,
    );
  }
  // 4. Filter sessions by isExpired: true (expired sessions only)
  const expiredSessions =
    await api.functional.ecommerceMall.admin.admin.sessions.index(
      adminConnection,
      {
        body: {
          isExpired: true,
          limit: 100,
        } satisfies IEcommerceMallAdminSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // 5. Validate all returned expired sessions are indeed expired
  for (const session of expiredSessions.data) {
    const expiredAt = new Date(session.expiredAt);
    TestValidator.predicate(
      "session should be expired when isExpired=true",
      expiredAt <= now,
    );
  }
  // 6. Verify the two result sets are mutually exclusive
  const activeSessionIds = new Set(activeSessions.data.map((s) => s.id));
  const expiredSessionIds = new Set(expiredSessions.data.map((s) => s.id));
  for (const id of activeSessionIds) {
    TestValidator.predicate(
      "active session should not appear in expired list",
      !expiredSessionIds.has(id),
    );
  }
  // 7. Filter sessions by specific adminId
  if (activeSessions.data.length > 0) {
    const specificAdminId = activeSessions.data[0].admin.id;
    const filteredByAdminId =
      await api.functional.ecommerceMall.admin.admin.sessions.index(
        adminConnection,
        {
          body: {
            adminId: specificAdminId,
            isExpired: false,
            limit: 100,
          } satisfies IEcommerceMallAdminSession.IRequest,
        },
      );
    typia.assert(filteredByAdminId);
    // Validate all sessions belong to the specified admin
    for (const session of filteredByAdminId.data) {
      TestValidator.equals(
        "session should belong to specified admin",
        session.admin.id,
        specificAdminId,
      );
    }
  }
  // 8. Test combining filters with date range
  const dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
  const dateTo = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day in future
  const filteredByDateRange =
    await api.functional.ecommerceMall.admin.admin.sessions.index(
      adminConnection,
      {
        body: {
          isExpired: false,
          createdAtAfter: dateFrom.toISOString() as string &
            tags.Format<"date-time">,
          createdAtBefore: dateTo.toISOString() as string &
            tags.Format<"date-time">,
          limit: 100,
        } satisfies IEcommerceMallAdminSession.IRequest,
      },
    );
  typia.assert(filteredByDateRange);
  // Validate all sessions are within the date range
  for (const session of filteredByDateRange.data) {
    const createdAt = new Date(session.createdAt);
    TestValidator.predicate(
      "session createdAt should be after dateFrom",
      createdAt >= dateFrom,
    );
    TestValidator.predicate(
      "session createdAt should be before dateTo",
      createdAt <= now,
    );
  }
}
