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

export async function test_api_audit_logs_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Perform actions to generate audit logs
  // Create employee - generates employee_invited audit log
  const employee = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {},
  );
  typia.assert(employee);
  // Create project - generates project_created audit log
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Filter by employee_invited action type
  const employeeInvitedLogs =
    await api.functional.erpHrm.admin.audit_logs.index(adminConnection, {
      body: {
        actionType: "employee_invited",
      } satisfies IErpHrmAdminAuditLog.IRequest,
    });
  typia.assert(employeeInvitedLogs);
  // 4. Verify only employee_invited logs are returned
  TestValidator.predicate(
    "employee_invited filter returns non-empty results",
    employeeInvitedLogs.data.length > 0,
  );
  for (const log of employeeInvitedLogs.data) {
    TestValidator.equals(
      "actionType matches employee_invited",
      log.actionType,
      "employee_invited",
    );
  }
  // 5. Filter by project_created action type
  const projectCreatedLogs = await api.functional.erpHrm.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        actionType: "project_created",
      } satisfies IErpHrmAdminAuditLog.IRequest,
    },
  );
  typia.assert(projectCreatedLogs);
  // 6. Verify only project_created logs are returned
  TestValidator.predicate(
    "project_created filter returns non-empty results",
    projectCreatedLogs.data.length > 0,
  );
  for (const log of projectCreatedLogs.data) {
    TestValidator.equals(
      "actionType matches project_created",
      log.actionType,
      "project_created",
    );
  }
  // Verify the two filter results are different
  TestValidator.notEquals(
    "different action types return different logs",
    employeeInvitedLogs.data.map((l) => l.id),
    projectCreatedLogs.data.map((l) => l.id),
  );
}
