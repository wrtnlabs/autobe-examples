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
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
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
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";
import { prepare_random_erp_hrm_report_parameter } from "../../../prepare/prepare_random_erp_hrm_report_parameter";

/**
 * Test that report generation works correctly within an organization and respects data boundaries.
 *
 * 1. Authenticate as member using /auth/member/join
 * 2. Create a project in the organization using /member/projects
 * 3. Generate a time report for the organization with current date range
 * 4. Verify the report is created successfully with organization data included
 * 5. Validate that the report contains only data from the authenticated member's organization
 *
 * This validates the business rule: 'Reports are generated exclusively from data within the user's current organization context.'
 */
export async function test_api_report_organization_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a project in the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Extract organizationId from the created project
  const organizationId = project.organization.id;
  TestValidator.equals("organization exists", !!organizationId, true);
  // 3. Generate a time report for the organization with current date range
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const report =
    await api.functional.erpHrm.member.organizations.reports.generate.create(
      memberConnection,
      {
        organizationId: organizationId,
        body: {
          report_type: "time_report",
          name: "Monthly Time Report",
          parameter: {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            group_by: "project",
          },
        } satisfies IErpHrmReport.ICreate,
      },
    );
  typia.assert(report);
  // 4. Verify the report is created successfully
  TestValidator.equals(
    "report type is time_report",
    report.report_type,
    "time_report",
  );
  TestValidator.equals("report has name", report.name, "Monthly Time Report");
  TestValidator.equals("report has organization", !!report.organization, true);
  TestValidator.equals(
    "report has generatedByMember",
    !!report.generatedByMember,
    true,
  );
  TestValidator.equals("report has parameter", !!report.parameter, true);
  // 5. Validate data isolation - report belongs to correct organization
  TestValidator.equals(
    "report organization matches project organization",
    report.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "report generated by member matches authenticated member",
    report.generatedByMember.id,
    authorized.id,
  );
  // Validate report parameters
  TestValidator.equals(
    "report parameter has correct start_date",
    report.parameter.start_date,
    startDate.toISOString(),
  );
  TestValidator.equals(
    "report parameter has correct end_date",
    report.parameter.end_date,
    endDate.toISOString(),
  );
  TestValidator.equals(
    "report parameter group_by is project",
    report.parameter.group_by,
    "project",
  );
}
