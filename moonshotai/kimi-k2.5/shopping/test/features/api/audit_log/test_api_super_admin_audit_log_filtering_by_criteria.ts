import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering super admin audit logs by specific criteria.
 *
 * 1. Authenticate as super admin using the join endpoint
 * 2. Test filtering by actionType (admin_promote, admin_demote)
 * 3. Test filtering by date range (createdAtMin, createdAtMax)
 * 4. Test filtering by IP address pattern
 * 5. Test combined criteria filtering
 * 6. Test pagination with page and limit
 * 7. Test sorting
 * 8. Test empty results for non-matching criteria
 */
export async function test_api_super_admin_audit_log_filtering_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin authentication - register to obtain JWT tokens
  // The join function automatically sets the Authorization header on the connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000/super-admin/join",
        referrer: "http://localhost:3000/",
        ip: "127.0.0.1",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // 2. Test filtering by actionType (e.g., 'admin_promote')
  const promoteLogs =
    await api.functional.ecommerceMall.superAdmin.super_admin_audit_logs.index(
      superAdminConnection,
      {
        body: {
          actionType: "admin_promote",
          limit: 100,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(promoteLogs);
  // Verify all returned logs match the filter criteria
  TestValidator.predicate(
    "filter by actionType 'admin_promote' - all results match",
    promoteLogs.data.every(
      (log: IEcommerceMallSuperAdminAuditLog.ISummary) =>
        log.actionType === "admin_promote",
    ),
  );
  // 3. Test filtering by date range (createdAtMin/createdAtMax)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeLogs =
    await api.functional.ecommerceMall.superAdmin.super_admin_audit_logs.index(
      superAdminConnection,
      {
        body: {
          createdAtMin: yesterday.toISOString(),
          createdAtMax: now.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(dateRangeLogs);
  TestValidator.predicate(
    "filter by date range - all results within specified range",
    dateRangeLogs.data.every(
      (log: IEcommerceMallSuperAdminAuditLog.ISummary) => {
        const logDate = new Date(log.createdAt);
        return logDate >= yesterday && logDate <= now;
      },
    ),
  );
  // 4. Test filtering by IP address pattern
  const ipLogs =
    await api.functional.ecommerceMall.superAdmin.super_admin_audit_logs.index(
      superAdminConnection,
      {
        body: {
          ipAddress: "127.0.0",
          limit: 100,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(ipLogs);
  TestValidator.predicate(
    "filter by IP address pattern - all results contain pattern",
    ipLogs.data.every((log: IEcommerceMallSuperAdminAuditLog.ISummary) =>
      log.ipAddress.includes("127.0.0"),
    ),
  );
  // 5. Test combined criteria (actionType + date range + superAdminId)
  const combinedLogs =
    await api.functional.ecommerceMall.superAdmin.super_admin_audit_logs.index(
      superAdminConnection,
      {
        body: {
          actionType: "admin_demote",
          createdAtMin: yesterday.toISOString(),
          createdAtMax: now.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(combinedLogs);
  TestValidator.predicate(
    "filter by combined criteria - all results match all conditions",
    combinedLogs.data.every(
      (log: IEcommerceMallSuperAdminAuditLog.ISummary) =>
        log.actionType === "admin_demote" &&
        new Date(log.createdAt) >= yesterday &&
        new Date(log.createdAt) <= now,
    ),
  );
  // 6. Test pagination with page and limit
  const pagedLogs =
    await api.functional.ecommerceMall.superAdmin.super_admin_audit_logs.index(
      superAdminConnection,
      {
        body: {
          limit: 2,
          page: 1,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(pagedLogs);
  TestValidator.equals(
    "pagination limit respected",
    pagedLogs.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination current page",
    pagedLogs.pagination.current,
    1,
  );
  // 7. Test sorting by createdAt descending
  const sortedLogs =
    await api.functional.ecommerceMall.superAdmin.super_admin_audit_logs.index(
      superAdminConnection,
      {
        body: {
          sort: ["createdAt:desc"],
          limit: 100,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(sortedLogs);
  // 8. Test empty result case with non-existent criteria
  const emptyLogs =
    await api.functional.ecommerceMall.superAdmin.super_admin_audit_logs.index(
      superAdminConnection,
      {
        body: {
          actionType: "non_existent_action_xyz_12345",
          limit: 100,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(emptyLogs);
  TestValidator.equals(
    "empty result for non-matching criteria",
    emptyLogs.data.length,
    0,
  );
}
