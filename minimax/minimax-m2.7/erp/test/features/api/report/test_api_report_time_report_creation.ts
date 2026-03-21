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
 * Test creating a time report with valid parameters including date range and group_by configuration.
 *
 * Steps:
 * 1. Authenticate as a member using /erpHrm/auth/member/join to get valid session credentials
 * 2. Get organization ID from the member's context (via activeTimers if available)
 * 3. Call POST /organizations/{organizationId}/reports with report_type='time_report',
 *    start_date, end_date, and group_by='project'
 * 4. Validate response body contains IErpHrmReport structure with: id (UUID),
 *    report_type='time_report', created_at timestamp, organization object, generatedByMember object
 * 5. Verify report parameter object includes the provided start_date, end_date, and group_by values
 * 6. Verify the generatedByMember matches the authenticated member from the session
 *
 * Expected business logic: Report is created successfully with system-generated UUID and timestamps,
 * filtered only by date range without any entity filters.
 */
export async function test_api_report_time_report_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member to get valid session credentials
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
  // Step 2: Get organization ID from the member's context
  // The authorized response contains activeTimers which have project with organization
  const organizationId =
    authorized.activeTimers[0]?.project.organization.id ??
    typia.random<string & tags.Format<"uuid">>();
  // Step 3: Generate date range for the report
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7); // 7 days ago
  const startDateStr = startDate.toISOString();
  const endDateStr = endDate.toISOString();
  // Step 4: Create time report with date range and group_by='project'
  const report =
    await api.functional.erpHrm.member.organizations.reports.create(
      memberConnection,
      {
        organizationId,
        body: {
          report_type: "time_report",
          parameter: {
            start_date: startDateStr,
            end_date: endDateStr,
            group_by: "project",
          } satisfies IErpHrmReportParameter.ICreate,
        } satisfies IErpHrmReport.ICreate,
      },
    );
  typia.assert(report);
  // Step 5: Validate response structure
  TestValidator.equals(
    "report_type is time_report",
    report.report_type,
    "time_report",
  );
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      report.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(report.created_at)),
  );
  // Step 6: Verify organization object exists
  TestValidator.equals(
    "organization exists",
    report.organization !== null,
    true,
  );
  TestValidator.predicate(
    "organization has valid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      report.organization.id,
    ),
  );
  // Step 7: Verify generatedByMember matches authenticated member
  TestValidator.equals(
    "generatedByMember exists",
    report.generatedByMember !== null,
    true,
  );
  TestValidator.equals(
    "generatedByMember matches authenticated member",
    report.generatedByMember.email,
    authorized.email,
  );
  // Step 8: Verify report parameters
  TestValidator.equals("parameter exists", report.parameter !== null, true);
  TestValidator.equals(
    "start_date matches input",
    report.parameter.start_date,
    startDateStr,
  );
  TestValidator.equals(
    "end_date matches input",
    report.parameter.end_date,
    endDateStr,
  );
  TestValidator.equals(
    "group_by is project",
    report.parameter.group_by,
    "project",
  );
}
