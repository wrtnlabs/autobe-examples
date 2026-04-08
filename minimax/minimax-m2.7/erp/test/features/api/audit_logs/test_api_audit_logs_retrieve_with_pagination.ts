import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminAuditLog";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_audit_logs_retrieve_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create employee to generate audit log entry
  await generate_random_erp_hrm_admin_employees_create(adminConnection, {});
  // 3. Create project to generate another audit log entry
  await generate_random_erp_hrm_admin_projects_create(adminConnection, {});
  // 4. Retrieve audit logs with empty request body (default pagination)
  const auditLogsResponse = await api.functional.erpHrm.admin.audit_logs.index(
    adminConnection,
    {
      body: {} satisfies IErpHrmAdminAuditLog.IRequest,
    },
  );
  typia.assert(auditLogsResponse);
  // Validate response has pagination metadata
  TestValidator.equals(
    "has pagination metadata",
    auditLogsResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(auditLogsResponse.data),
    true,
  );
  TestValidator.predicate(
    "has records count",
    auditLogsResponse.pagination.records >= 2,
  );
  TestValidator.predicate(
    "has valid pages count",
    auditLogsResponse.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "has valid limit",
    auditLogsResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "has valid current page",
    auditLogsResponse.pagination.current >= 1,
  );
  // Validate each audit log entry has required fields
  for (const auditLog of auditLogsResponse.data) {
    TestValidator.predicate(
      "has valid id",
      /^[0-9a-f-]{36}$/i.test(auditLog.id),
    );
    TestValidator.equals(
      "has actionType",
      typeof auditLog.actionType === "string",
      true,
    );
    TestValidator.equals(
      "has targetEntity",
      typeof auditLog.targetEntity === "string",
      true,
    );
    TestValidator.predicate(
      "has valid targetId",
      /^[0-9a-f-]{36}$/i.test(auditLog.targetId),
    );
    TestValidator.equals(
      "has createdAt",
      typeof auditLog.createdAt === "string",
      true,
    );
    TestValidator.predicate(
      "has admin object",
      auditLog.admin !== null && auditLog.admin !== undefined,
    );
    TestValidator.predicate(
      "has valid admin id",
      /^[0-9a-f-]{36}$/i.test(auditLog.admin.id),
    );
    TestValidator.equals(
      "has admin email",
      typeof auditLog.admin.email === "string",
      true,
    );
    TestValidator.equals(
      "has admin displayName",
      typeof auditLog.admin.displayName === "string",
      true,
    );
  }
  // Validate results are sorted by createdAt descending
  for (let i = 0; i < auditLogsResponse.data.length - 1; i++) {
    const current = new Date(auditLogsResponse.data[i].createdAt).getTime();
    const next = new Date(auditLogsResponse.data[i + 1].createdAt).getTime();
    TestValidator.predicate("sorted by createdAt descending", current >= next);
  }
  // Validate employee_created and project_created actions appear in results
  const actionTypes = auditLogsResponse.data.map((log) => log.actionType);
  TestValidator.predicate(
    "has employee_created action",
    actionTypes.includes("employee_created"),
  );
  TestValidator.predicate(
    "has project_created action",
    actionTypes.includes("project_created"),
  );
}
