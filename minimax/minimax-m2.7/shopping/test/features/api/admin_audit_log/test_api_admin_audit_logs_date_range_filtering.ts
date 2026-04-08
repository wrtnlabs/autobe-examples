import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_audit_logs_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Get current timestamp and calculate date ranges
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // 3. Query all audit logs first to establish baseline with concrete pagination
  const allLogsResponse =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(allLogsResponse);
  // 4. Test date range filter - last 7 days (createdAtFrom only)
  const last7DaysResponse =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: sevenDaysAgo.toISOString() as string &
            tags.Format<"date-time">,
          sortOrder: "asc",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(last7DaysResponse);
  // Validate all returned logs are within the last 7 days
  for (const auditLog of last7DaysResponse.data) {
    const logDate = new Date(auditLog.createdAt);
    TestValidator.predicate(
      "log within last 7 days range",
      logDate >= sevenDaysAgo && logDate <= now,
    );
  }
  // 5. Test date range filter - specific range (createdAtFrom and createdAtTo)
  const specificRangeResponse =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: threeDaysAgo.toISOString() as string &
            tags.Format<"date-time">,
          createdAtTo: oneDayAgo.toISOString() as string &
            tags.Format<"date-time">,
          sortOrder: "asc",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(specificRangeResponse);
  // Validate all returned logs are within the specific range (inclusive)
  for (const auditLog of specificRangeResponse.data) {
    const logDate = new Date(auditLog.createdAt);
    TestValidator.predicate(
      "log within specific date range",
      logDate >= threeDaysAgo && logDate <= oneDayAgo,
    );
  }
  // 6. Test same-day filtering - start and end of day
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
  const sameDayResponse =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: startOfToday.toISOString() as string &
            tags.Format<"date-time">,
          createdAtTo: endOfToday.toISOString() as string &
            tags.Format<"date-time">,
          sortOrder: "asc",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(sameDayResponse);
  // Validate all returned logs are within today
  for (const auditLog of sameDayResponse.data) {
    const logDate = new Date(auditLog.createdAt);
    TestValidator.predicate(
      "log within same day range",
      logDate >= startOfToday && logDate <= endOfToday,
    );
  }
  // 7. Validate pagination metadata is present and valid
  TestValidator.predicate(
    "last 7 days response has pagination",
    last7DaysResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "specific range response has pagination",
    specificRangeResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "same day response has pagination",
    sameDayResponse.pagination !== undefined,
  );
  // 8. Validate audit log structure
  for (const auditLog of last7DaysResponse.data) {
    TestValidator.predicate(
      "log has valid UUID",
      /^[0-9a-f-]{36}$/i.test(auditLog.id),
    );
    TestValidator.predicate(
      "log has action",
      auditLog.action !== undefined && auditLog.action.length > 0,
    );
    TestValidator.predicate(
      "log has resourceType",
      auditLog.resourceType !== undefined && auditLog.resourceType.length > 0,
    );
    TestValidator.predicate(
      "log has valid resource UUID",
      /^[0-9a-f-]{36}$/i.test(auditLog.resourceId),
    );
    TestValidator.predicate(
      "log has ipAddress",
      auditLog.ipAddress !== undefined,
    );
    TestValidator.predicate(
      "log has createdAt",
      auditLog.createdAt !== undefined,
    );
    TestValidator.predicate("log has admin info", auditLog.admin !== undefined);
  }
}
