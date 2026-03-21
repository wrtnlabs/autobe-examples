import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminAuthorized = await authorize_admin_join(connection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Define date range for filtering (30 days range)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const createdAtFrom = thirtyDaysAgo.toISOString();
  const createdAtTo = now.toISOString();
  // 3. Query audit logs with date range filter (descending order - default)
  const descendingResult =
    await api.functional.erpHrm.admin.admin_audit_logs.index(adminConnection, {
      body: {
        created_at_from: createdAtFrom,
        created_at_to: createdAtTo,
        sort: "created_at",
        order: "desc",
      } satisfies IErpHrmAdminAuditLog.IRequest,
    });
  typia.assert(descendingResult);
  // Validate descending order: newest entries appear first
  if (descendingResult.data.length > 1) {
    for (let i = 0; i < descendingResult.data.length - 1; i++) {
      const current = new Date(descendingResult.data[i].createdAt).getTime();
      const next = new Date(descendingResult.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        "descending order - newer entries first",
        current >= next,
      );
    }
  }
  // Validate all entries are within date range
  for (const log of descendingResult.data) {
    const createdAt = new Date(log.createdAt).getTime();
    const fromTime = new Date(createdAtFrom).getTime();
    const toTime = new Date(createdAtTo).getTime();
    TestValidator.predicate(
      "createdAt within specified date range",
      createdAt >= fromTime && createdAt <= toTime,
    );
  }
  // 4. Query audit logs with date range filter (ascending order)
  const ascendingResult =
    await api.functional.erpHrm.admin.admin_audit_logs.index(adminConnection, {
      body: {
        created_at_from: createdAtFrom,
        created_at_to: createdAtTo,
        sort: "created_at",
        order: "asc",
      } satisfies IErpHrmAdminAuditLog.IRequest,
    });
  typia.assert(ascendingResult);
  // Validate ascending order: oldest entries appear first
  if (ascendingResult.data.length > 1) {
    for (let i = 0; i < ascendingResult.data.length - 1; i++) {
      const current = new Date(ascendingResult.data[i].createdAt).getTime();
      const next = new Date(ascendingResult.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        "ascending order - oldest entries first",
        current <= next,
      );
    }
  }
  // Validate all entries are within date range
  for (const log of ascendingResult.data) {
    const createdAt = new Date(log.createdAt).getTime();
    const fromTime = new Date(createdAtFrom).getTime();
    const toTime = new Date(createdAtTo).getTime();
    TestValidator.predicate(
      "createdAt within specified date range (ascending)",
      createdAt >= fromTime && createdAt <= toTime,
    );
  }
  // 5. Test with narrower date range (same day)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const sameDayResult =
    await api.functional.erpHrm.admin.admin_audit_logs.index(adminConnection, {
      body: {
        created_at_from: todayStart.toISOString(),
        created_at_to: todayEnd.toISOString(),
        sort: "created_at",
        order: "desc",
      } satisfies IErpHrmAdminAuditLog.IRequest,
    });
  typia.assert(sameDayResult);
  // All entries should be from today
  for (const log of sameDayResult.data) {
    const createdAt = new Date(log.createdAt);
    const isToday =
      createdAt.getDate() === todayStart.getDate() &&
      createdAt.getMonth() === todayStart.getMonth() &&
      createdAt.getFullYear() === todayStart.getFullYear();
    TestValidator.predicate("entry is from today", isToday);
  }
}
