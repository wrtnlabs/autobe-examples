import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_reports_create } from "../../../generate/generate_random_erp_hrm_admin_reports_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";

export async function test_api_report_update_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and create organization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 2. Create employee for filtering (owner is automatically an employee)
  // Use organization.owner.id as the employee filter reference
  // 3. Create project for filtering
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Create initial report with basic parameters
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const initialReport = await generate_random_erp_hrm_admin_reports_create(
    adminConnection,
    {
      body: {
        reportType: "time_report",
        name: "Initial Report",
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        groupBy: "employee",
        billable: undefined,
      } satisfies IErpHrmReport.ICreate,
    },
  );
  typia.assert(initialReport);
  // 5. Update report with employee_id and project_id filters
  const updatedReport = await api.functional.erpHrm.admin.reports.update(
    adminConnection,
    {
      reportId: initialReport.id,
      body: {
        name: "Updated Report with Filters",
        parameter: {
          employeeId: organization.owner.id,
          projectId: (typia.assert(project) as IErpHrmProject & { id: string }).id,
          billable: true,
          groupBy: "project",
        } satisfies IErpHrmReportParameter.IUpdate,
      } satisfies IErpHrmReport.IUpdate,
    },
  );
  typia.assert(updatedReport);
  // 6. Validate updated parameters
  TestValidator.equals(
    "report name updated",
    updatedReport.name,
    "Updated Report with Filters",
  );
  TestValidator.equals(
    "employee_id filter applied",
    updatedReport.parameter.employee_id,
    organization.owner.id,
  );
  TestValidator.equals(
    "project_id filter applied",
    updatedReport.parameter.project_id,
    (typia.assert(project) as IErpHrmProject & { id: string }).id,
  );
  TestValidator.equals(
    "billable status updated to true",
    updatedReport.parameter.billable,
    true,
  );
  TestValidator.equals(
    "groupBy updated to project",
    updatedReport.parameter.group_by,
    "project",
  );
  // 7. Update billable status to false
  const updatedReportFalse = await api.functional.erpHrm.admin.reports.update(
    adminConnection,
    {
      reportId: initialReport.id,
      body: {
        parameter: {
          billable: false,
        } satisfies IErpHrmReportParameter.IUpdate,
      } satisfies IErpHrmReport.IUpdate,
    },
  );
  typia.assert(updatedReportFalse);
  // 8. Validate billable status updated to false
  TestValidator.equals(
    "billable status updated to false",
    updatedReportFalse.parameter.billable,
    false,
  );
  // 9. Update only employee filter to test partial updates
  const updatedEmployeeFilter =
    await api.functional.erpHrm.admin.reports.update(adminConnection, {
      reportId: initialReport.id,
      body: {
        parameter: {
          employeeId: organization.owner.id,
        } satisfies IErpHrmReportParameter.IUpdate,
      } satisfies IErpHrmReport.IUpdate,
    });
  typia.assert(updatedEmployeeFilter);
  // 10. Validate employee filter is preserved
  TestValidator.equals(
    "employee_id filter preserved",
    updatedEmployeeFilter.parameter.employee_id,
    organization.owner.id,
  );
}