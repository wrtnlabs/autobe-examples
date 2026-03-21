import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_organizations_reports_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_reports_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";
import { prepare_random_erp_hrm_report_parameter } from "../../../prepare/prepare_random_erp_hrm_report_parameter";

export async function test_api_report_parameters_grouping_preferences(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create organization ID for testing
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create report with group_by=employee
  const employeeReport =
    await generate_random_erp_hrm_admin_organizations_reports_create(
      adminConnection,
      {
        params: { organizationId },
        body: {
          report_type: "time_report",
          parameter: {
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 86400000).toISOString(),
            group_by: "employee",
            billable: null,
          },
        },
      },
    );
  typia.assert(employeeReport);
  // 4. Create report with group_by=project
  const projectReport =
    await generate_random_erp_hrm_admin_organizations_reports_create(
      adminConnection,
      {
        params: { organizationId },
        body: {
          report_type: "time_report",
          parameter: {
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 86400000).toISOString(),
            group_by: "project",
            billable: true,
          },
        },
      },
    );
  typia.assert(projectReport);
  // 5. Create report with group_by=task
  const taskReport =
    await generate_random_erp_hrm_admin_organizations_reports_create(
      adminConnection,
      {
        params: { organizationId },
        body: {
          report_type: "time_report",
          parameter: {
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 86400000).toISOString(),
            group_by: "task",
            billable: false,
          },
        },
      },
    );
  typia.assert(taskReport);
  // 6. Retrieve parameters for employee-grouped report
  const employeeParams =
    await api.functional.erpHrm.admin.organizations.reports.parameters.at(
      adminConnection,
      {
        organizationId,
        reportId: employeeReport.id,
      },
    );
  typia.assert(employeeParams);
  // 7. Retrieve parameters for project-grouped report
  const projectParams =
    await api.functional.erpHrm.admin.organizations.reports.parameters.at(
      adminConnection,
      {
        organizationId,
        reportId: projectReport.id,
      },
    );
  typia.assert(projectParams);
  // 8. Retrieve parameters for task-grouped report
  const taskParams =
    await api.functional.erpHrm.admin.organizations.reports.parameters.at(
      adminConnection,
      {
        organizationId,
        reportId: taskReport.id,
      },
    );
  typia.assert(taskParams);
  // 9. Validate group_by values
  TestValidator.equals(
    "employee report group_by",
    employeeParams.group_by,
    "employee",
  );
  TestValidator.equals(
    "project report group_by",
    projectParams.group_by,
    "project",
  );
  TestValidator.equals("task report group_by", taskParams.group_by, "task");
  // 10. Validate optional filters can be null when not specified
  TestValidator.equals(
    "employee report employee filter",
    employeeParams.employee,
    null,
  );
  TestValidator.equals(
    "project report project filter",
    projectParams.project,
    null,
  );
  TestValidator.equals("task report task filter", taskParams.task, null);
  // 11. Validate billable filter supports true/false/null values
  TestValidator.equals(
    "employee report billable is null",
    employeeParams.billable,
    null,
  );
  TestValidator.equals(
    "project report billable is true",
    projectParams.billable,
    true,
  );
  TestValidator.equals(
    "task report billable is false",
    taskParams.billable,
    false,
  );
  // 12. Validate timestamps exist for all reports
  TestValidator.predicate(
    "employee report has valid timestamps",
    employeeParams.created_at !== undefined &&
      employeeParams.updated_at !== undefined,
  );
  TestValidator.predicate(
    "project report has valid timestamps",
    projectParams.created_at !== undefined &&
      projectParams.updated_at !== undefined,
  );
  TestValidator.predicate(
    "task report has valid timestamps",
    taskParams.created_at !== undefined && taskParams.updated_at !== undefined,
  );
}
