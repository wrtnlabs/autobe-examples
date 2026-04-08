import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_audit_logs_filtering_by_date_and_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Capture timestamp before creating another super admin
  const beforeTimestamp = new Date();
  // Small delay to ensure clear time boundary
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Create another super admin to generate audit log entries
  // This registration will create audit log entries for the first super admin
  const secondSuperAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(secondSuperAdminConnection, {});
  // Small delay and capture timestamp after admin creation
  await new Promise((resolve) => setTimeout(resolve, 100));
  const afterTimestamp = new Date();
  // 4. Query all audit logs to find the admin ID from the logged action
  const allLogs =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(allLogs);
  // Find the admin ID from recent audit log entries
  // The audit log should contain entries about the second super admin registration
  const recentLog = allLogs.data.find(
    (log) => new Date(log.createdAt).getTime() >= beforeTimestamp.getTime(),
  );
  if (!recentLog) {
    throw new Error("Failed to find recent audit log entries");
  }
  const targetAdminId = recentLog.admin.id;
  // 5. Query audit logs with date range and admin ID filters
  const filteredLogs =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: beforeTimestamp.toISOString(),
          createdAtTo: afterTimestamp.toISOString(),
          ecommerceMallAdminId: targetAdminId,
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(filteredLogs);
  // 6. Validate all returned logs fall within the specified date range
  const fromDate = beforeTimestamp.getTime();
  const toDate = afterTimestamp.getTime();
  for (const log of filteredLogs.data) {
    const logTimestamp = new Date(log.createdAt).getTime();
    // Validate createdAt >= createdAtFrom
    TestValidator.predicate(
      "audit log createdAt >= createdAtFrom",
      logTimestamp >= fromDate,
    );
    // Validate createdAt <= createdAtTo
    TestValidator.predicate(
      "audit log createdAt <= createdAtTo",
      logTimestamp <= toDate,
    );
    // Validate log belongs to the specified administrator
    TestValidator.equals(
      "audit log belongs to specified admin",
      log.admin.id,
      targetAdminId,
    );
  }
  // 7. Validate at least one log was returned (we created a super admin)
  TestValidator.predicate(
    "at least one audit log matches filter criteria",
    filteredLogs.data.length > 0,
  );
}
