import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_audit_logs_super_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Primary Success - Retrieve all audit logs without filters
  const allLogs = await api.functional.ecommerceMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(allLogs);
  TestValidator.equals(
    "has pagination",
    allLogs.pagination !== undefined,
    true,
  );
  TestValidator.equals("data is array", Array.isArray(allLogs.data), true);
  TestValidator.equals("pagination current valid", allLogs.pagination!.current >= 1, true);
  TestValidator.equals("pagination limit valid", allLogs.pagination!.limit > 0, true);
  TestValidator.equals("pagination records valid", allLogs.pagination!.records >= 0, true);
  TestValidator.equals("pagination pages valid", allLogs.pagination!.pages >= 0, true);
  // 3. Filter by date range
  const startDate = new Date();
  startDate.setFullYear(2024);
  startDate.setMonth(0);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date();
  endDate.setFullYear(2024);
  endDate.setMonth(11);
  endDate.setDate(31);
  endDate.setHours(23, 59, 59, 999);
  const dateFilteredLogs =
    await api.functional.ecommerceMall.admin.audit_logs.index(adminConnection, {
      body: {
        date_range: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        } satisfies IDateRange,
      } satisfies IEcommerceMallAdminAuditLog.IRequest,
    });
  typia.assert(dateFilteredLogs);
  // 4. Filter by action type
  const actionTypeFilteredLogs =
    await api.functional.ecommerceMall.admin.audit_logs.index(adminConnection, {
      body: {
        action_type: "user_ban",
      } satisfies IEcommerceMallAdminAuditLog.IRequest,
    });
  typia.assert(actionTypeFilteredLogs);
  // 5. Filter by specific admin (if we have one)
  const adminIdFilteredLogs =
    await api.functional.ecommerceMall.admin.audit_logs.index(adminConnection, {
      body: {
        admin_id: admin.id,
      } satisfies IEcommerceMallAdminAuditLog.IRequest,
    });
  typia.assert(adminIdFilteredLogs);
  TestValidator.predicate(
    "admin_id filter returns correct admin",
    adminIdFilteredLogs.data.every((log) => log.admin.id === admin.id) ||
      adminIdFilteredLogs.data.length === 0,
  );
  // 6. Text search on log content
  const searchQuery = RandomGenerator.alphaNumeric(10);
  const textSearchLogs =
    await api.functional.ecommerceMall.admin.audit_logs.index(adminConnection, {
      body: {
        text_search: searchQuery,
      } satisfies IEcommerceMallAdminAuditLog.IRequest,
    });
  typia.assert(textSearchLogs);
  // 7. Pagination validation - limit=10
  const limit10Logs = await api.functional.ecommerceMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(limit10Logs);
  TestValidator.predicate(
    "limit 10 returns at most 10 items",
    limit10Logs.data.length <= 10,
  );
  TestValidator.equals("limit 10 pagination", limit10Logs.pagination.limit, 10);
  // 8. Pagination validation - limit=50
  const limit50Logs = await api.functional.ecommerceMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IEcommerceMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(limit50Logs);
  TestValidator.predicate(
    "limit 50 returns at most 50 items",
    limit50Logs.data.length <= 50,
  );
  TestValidator.equals("limit 50 pagination", limit50Logs.pagination.limit, 50);
  // 9. Sorting validation - default sort by created_at DESC
  const defaultSortLogs =
    await api.functional.ecommerceMall.admin.audit_logs.index(adminConnection, {
      body: {
        sort: "created_at",
      } satisfies IEcommerceMallAdminAuditLog.IRequest,
    });
  typia.assert(defaultSortLogs);
  // 10. Verify response structure compliance
  const firstLog = allLogs.data[0];
  if (firstLog) {
    TestValidator.equals(
      "audit log has id",
      typeof firstLog.id === "string",
      true,
    );
    TestValidator.equals(
      "audit log has admin",
      firstLog.admin !== undefined && firstLog.admin !== null,
      true,
    );
    TestValidator.equals(
      "audit log has actionType",
      typeof firstLog.actionType === "string",
      true,
    );
    TestValidator.equals(
      "audit log has targetEntityType",
      typeof firstLog.targetEntityType === "string",
      true,
    );
    TestValidator.equals(
      "audit log has createdAt",
      typeof firstLog.createdAt === "string",
      true,
    );
  }
}
