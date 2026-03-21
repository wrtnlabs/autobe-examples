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
 * Test successful report generation with all supported parameters.
 *
 * This E2E test validates the complete report generation workflow:
 * 1. Authenticate as a member using /auth/member/join to create account
 * 2. Create a project within the organization using /member/projects endpoint
 * 3. Call POST /member/organizations/{organizationId}/reports/generate with:
 *    - report_type: 'time_report'
 *    - name: 'Q1 Time Analysis Report'
 *    - parameter with start_date and end_date defining a valid date range
 *    - group_by: 'employee'
 *    - billable: true
 * 4. Verify the response returns HTTP 201 Created
 * 5. Validate response body contains all expected fields
 */
export async function test_api_report_generation_with_full_parameters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // Create authenticated connection with token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 2. Create a project within the organization to establish test context
  const project = await generate_random_erp_hrm_member_projects_create(
    authenticatedConnection,
    {},
  );
  typia.assert(project);
  // 3. Generate report with full parameters
  const report =
    await api.functional.erpHrm.member.organizations.reports.generate.create(
      authenticatedConnection,
      {
        organizationId: project.organization.id,
        body: {
          report_type: "time_report",
          name: "Q1 Time Analysis Report",
          parameter: {
            start_date: new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            end_date: new Date().toISOString(),
            group_by: "employee",
            billable: true,
          } satisfies IErpHrmReportParameter.ICreate,
        } satisfies IErpHrmReport.ICreate,
      },
    );
  typia.assert(report);
  // 4. Validate response structure
  TestValidator.equals(
    "report_type matches",
    report.report_type,
    "time_report",
  );
  TestValidator.equals("name matches", report.name, "Q1 Time Analysis Report");
  TestValidator.equals(
    "organization id matches",
    report.organization.id,
    project.organization.id,
  );
  TestValidator.equals(
    "parameter start_date exists",
    !!report.parameter.start_date,
    true,
  );
  TestValidator.equals(
    "parameter end_date exists",
    !!report.parameter.end_date,
    true,
  );
  TestValidator.equals(
    "parameter group_by matches",
    report.parameter.group_by,
    "employee",
  );
  TestValidator.equals(
    "parameter billable matches",
    report.parameter.billable,
    true,
  );
  TestValidator.equals(
    "generatedByMember exists",
    !!report.generatedByMember,
    true,
  );
  TestValidator.equals("created_at exists", !!report.created_at, true);
  TestValidator.equals("updated_at exists", !!report.updated_at, true);
  TestValidator.equals(
    "id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      report.id,
    ),
    true,
  );
}
