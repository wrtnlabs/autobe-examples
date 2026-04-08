import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminAuditLog";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";

export async function test_api_audit_logs_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a department to generate audit log entry
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {},
  );
  typia.assert(department);
  // 3. Define date range that includes current time
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const createdAtFrom = oneHourAgo.toISOString();
  const createdAtTo = oneHourLater.toISOString();
  // 4. Call PATCH /erpHrm/admin/audit-logs with date range filter
  const auditLogsResponse = await api.functional.erpHrm.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        createdAtFrom: createdAtFrom as string & tags.Format<"date-time">,
        createdAtTo: createdAtTo as string & tags.Format<"date-time">,
      } satisfies IErpHrmAdminAuditLog.IRequest,
    },
  );
  typia.assert(auditLogsResponse);
  // 5. Validations
  // Verify pagination metadata exists and is valid
  TestValidator.equals(
    "pagination exists",
    auditLogsResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "records count is non-negative",
    auditLogsResponse.pagination.records >= 0,
  );
  // Verify all returned audit logs are within the specified date range
  for (const log of auditLogsResponse.data) {
    const logDate = new Date(log.createdAt).getTime();
    const fromTime = oneHourAgo.getTime();
    const toTime = oneHourLater.getTime();
    TestValidator.predicate(
      `Audit log ${log.id} createdAt >= createdAtFrom`,
      logDate >= fromTime,
    );
    TestValidator.predicate(
      `Audit log ${log.id} createdAt <= createdAtTo`,
      logDate <= toTime,
    );
  }
  // Verify department creation audit log is included
  const hasDepartmentAuditLog = auditLogsResponse.data.some(
    (log) =>
      log.targetEntity === "department" && log.targetId === department.id,
  );
  TestValidator.equals(
    "department creation audit log is included",
    hasDepartmentAuditLog,
    true,
  );
  // 6. Test empty request body (no filters) - should return all logs
  const allLogsResponse = await api.functional.erpHrm.admin.audit_logs.index(
    adminConnection,
    {
      body: {} satisfies IErpHrmAdminAuditLog.IRequest,
    },
  );
  typia.assert(allLogsResponse);
  TestValidator.predicate(
    "empty body returns results",
    allLogsResponse.data.length >= auditLogsResponse.data.length,
  );
}
