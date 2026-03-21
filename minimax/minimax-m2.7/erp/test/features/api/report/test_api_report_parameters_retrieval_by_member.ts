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
import { generate_random_erp_hrm_member_organizations_reports_create } from "../../../generate/generate_random_erp_hrm_member_organizations_reports_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";
import { prepare_random_erp_hrm_report_parameter } from "../../../prepare/prepare_random_erp_hrm_report_parameter";

/**
 * Test retrieving report parameters as an authenticated member with report:view permission.
 *
 * Steps:
 * 1. Authenticate as a member via POST /erpHrm/auth/member/join
 * 2. Create a report within the organization via POST /erpHrm/member/organizations/{organizationId}/reports
 * 3. Extract the reportId from the created report
 * 4. Call GET /erpHrm/member/organizations/{organizationId}/reports/{reportId}/parameters
 * 5. Verify response returns IErpHrmReportParameter.IInvert with correct structure
 * 6. Verify response contains correct date range and filters matching the created report
 * 7. Verify data isolation: parameters belong to the correct reportId
 */
export async function test_api_report_parameters_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Extract organization ID from the authorized response (from activeTimers or projectSummary)
  const organizationId = memberAuth.activeTimers[0]?.project.organization.id;
  if (!organizationId) {
    throw new Error("No organization found in member authorization");
  }
  // 2. Create a report within the organization
  const report =
    await generate_random_erp_hrm_member_organizations_reports_create(
      memberConnection,
      {
        params: {
          organizationId: organizationId,
        },
      },
    );
  typia.assert(report);
  // 3. Extract reportId from the created report
  const reportId = report.id;
  // 4. Call GET /erpHrm/member/organizations/{organizationId}/reports/{reportId}/parameters
  const parameters =
    await api.functional.erpHrm.member.organizations.reports.parameters.at(
      memberConnection,
      {
        organizationId: organizationId,
        reportId: reportId,
      },
    );
  // 5. Verify response returns IErpHrmReportParameter.IInvert
  typia.assert(parameters);
  // 6. Verify response contains correct date range matching the created report
  TestValidator.equals(
    "start_date matches",
    parameters.start_date,
    report.parameter.start_date,
  );
  TestValidator.equals(
    "end_date matches",
    parameters.end_date,
    report.parameter.end_date,
  );
  // Verify response contains valid group_by value
  TestValidator.predicate(
    "group_by is valid employee|project|task",
    parameters.group_by === "employee" ||
      parameters.group_by === "project" ||
      parameters.group_by === "task",
  );
  // 7. Verify embedded report summary is present and matches
  TestValidator.equals(
    "report summary exists",
    parameters.report !== null && parameters.report !== undefined,
    true,
  );
  TestValidator.equals("report ID matches", parameters.report.id, reportId);
  // Verify timestamps exist (created_at and updated_at are required fields)
  TestValidator.predicate(
    "has valid created_at",
    typeof parameters.created_at === "string",
  );
  TestValidator.predicate(
    "has valid updated_at",
    typeof parameters.updated_at === "string",
  );
}
