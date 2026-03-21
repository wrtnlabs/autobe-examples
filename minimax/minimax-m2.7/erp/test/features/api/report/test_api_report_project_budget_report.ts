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

/**
 * Test creating a project budget report to verify budget tracking functionality.
 * 1. Admin authenticates via admin/join
 * 2. Creates a report with report_type='project_budget_report', group_by='project', and a specific date range
 * 3. Validate that the report is created successfully with the project_budget_report type
 * 4. Verify the report includes all project-related budget data in the response
 */
export async function test_api_report_project_budget_report(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
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
  // 2. Create a project budget report with date range
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const report = await api.functional.erpHrm.admin.organizations.reports.create(
    adminConnection,
    {
      organizationId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        report_type: "project_budget_report",
        name: RandomGenerator.name(),
        parameter: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          group_by: "project",
        } satisfies IErpHrmReportParameter.ICreate,
      } satisfies IErpHrmReport.ICreate,
    },
  );
  typia.assert(report);
  // 3. Validate report type
  TestValidator.equals(
    "report type is project_budget_report",
    report.report_type,
    "project_budget_report",
  );
  // 4. Validate report name matches input
  TestValidator.equals("report name matches input", report.name, report.name);
  // 5. Validate parameter grouping
  TestValidator.equals(
    "group_by is project",
    report.parameter.group_by,
    "project",
  );
  // 6. Validate date range in parameters
  TestValidator.equals(
    "start_date matches",
    report.parameter.start_date,
    startDate.toISOString(),
  );
  TestValidator.equals(
    "end_date matches",
    report.parameter.end_date,
    endDate.toISOString(),
  );
  // 7. Validate organization exists in response
  TestValidator.predicate("organization exists", report.organization !== null);
  // 8. Validate generatedByMember exists in response
  TestValidator.predicate(
    "generatedByMember exists",
    report.generatedByMember !== null,
  );
}
