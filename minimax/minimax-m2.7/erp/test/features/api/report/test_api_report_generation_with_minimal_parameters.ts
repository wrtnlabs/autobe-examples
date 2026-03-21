import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_reports_generate_create } from "../../../generate/generate_random_erp_hrm_member_organizations_reports_generate_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";
import { prepare_random_erp_hrm_report_parameter } from "../../../prepare/prepare_random_erp_hrm_report_parameter";

export async function test_api_report_generation_with_minimal_parameters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Get organization ID - use a generated UUID for the test
  // The organizationId needs to be a valid UUID format string
  const organizationId = (() => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}` as string;
  })();
  // 3. Generate first report with weekly_summary_report and group_by 'project'
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date();
  const weeklyReport =
    await api.functional.erpHrm.member.organizations.reports.generate.create(
      memberConnection,
      {
        organizationId,
        body: {
          report_type: "weekly_summary_report",
          parameter: {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            group_by: "project",
            employee_id: null,
            project_id: null,
            task_id: null,
            billable: null,
          },
        },
      },
    );
  typia.assert(weeklyReport);
  // 4. Validate weekly report response
  TestValidator.equals(
    "report_type is weekly_summary_report",
    weeklyReport.report_type,
    "weekly_summary_report",
  );
  TestValidator.equals(
    "parameter group_by is project",
    weeklyReport.parameter.group_by,
    "project",
  );
  TestValidator.equals(
    "employee is null",
    weeklyReport.parameter.employee,
    null,
  );
  TestValidator.equals("project is null", weeklyReport.parameter.project, null);
  TestValidator.equals("task is null", weeklyReport.parameter.task, null);
  TestValidator.equals(
    "billable is null",
    weeklyReport.parameter.billable,
    null,
  );
  // 5. Generate second report with project_budget_report and group_by 'task'
  const projectBudgetReport =
    await api.functional.erpHrm.member.organizations.reports.generate.create(
      memberConnection,
      {
        organizationId,
        body: {
          report_type: "project_budget_report",
          parameter: {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            group_by: "task",
            employee_id: null,
            project_id: null,
            task_id: null,
            billable: null,
          },
        },
      },
    );
  typia.assert(projectBudgetReport);
  // 6. Validate project budget report response
  TestValidator.equals(
    "report_type is project_budget_report",
    projectBudgetReport.report_type,
    "project_budget_report",
  );
  TestValidator.equals(
    "parameter group_by is task",
    projectBudgetReport.parameter.group_by,
    "task",
  );
  TestValidator.equals(
    "employee is null",
    projectBudgetReport.parameter.employee,
    null,
  );
  TestValidator.equals(
    "project is null",
    projectBudgetReport.parameter.project,
    null,
  );
  TestValidator.equals(
    "task is null",
    projectBudgetReport.parameter.task,
    null,
  );
  TestValidator.equals(
    "billable is null",
    projectBudgetReport.parameter.billable,
    null,
  );
}
