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

export async function test_api_report_retrieval_by_authorized_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // Create authenticated connection with access token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 2. Get organization - member should have access to an organization
  // Since join doesn't create organization, we need to assume the member
  // is already part of an organization in the test environment
  // For this test, we'll create the report using organizationId from context
  // Using a placeholder UUID that represents the test environment's default org
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a report within the organization
  const report =
    await generate_random_erp_hrm_member_organizations_reports_create(
      authenticatedConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(report);
  // 4. Extract the reportId from the created report
  const reportId = report.id;
  // 5. Retrieve the report by its unique identifier
  const retrievedReport =
    await api.functional.erpHrm.member.organizations.reports.at(
      authenticatedConnection,
      {
        organizationId,
        reportId,
      },
    );
  typia.assert(retrievedReport);
  // 6. Validate HTTP 200 OK - typia.assert passes for valid response
  // 7. Verify response body contains all expected report fields
  TestValidator.equals("report id matches", retrievedReport.id, reportId);
  TestValidator.equals(
    "report_type matches",
    retrievedReport.report_type,
    report.report_type,
  );
  TestValidator.equals(
    "name matches",
    retrievedReport.name ?? undefined,
    report.name ?? undefined,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedReport.created_at,
    report.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedReport.updated_at,
    report.updated_at,
  );
  // 8. Validate the organization relationship matches the requested organizationId
  TestValidator.equals(
    "organization id matches",
    retrievedReport.organization.id,
    organizationId,
  );
  // 9. Verify the generatedByMember relationship contains creator information
  TestValidator.predicate(
    "generatedByMember exists",
    retrievedReport.generatedByMember !== null,
  );
  TestValidator.equals(
    "generatedByMember id matches",
    retrievedReport.generatedByMember.id,
    authorized.id,
  );
  TestValidator.equals(
    "generatedByMember email matches",
    retrievedReport.generatedByMember.email,
    authorized.email,
  );
  TestValidator.equals(
    "generatedByMember displayName matches",
    retrievedReport.generatedByMember.displayName,
    authorized.display_name,
  );
  // 10. Validate the parameter relationship is included
  TestValidator.predicate(
    "parameter exists",
    retrievedReport.parameter !== null,
  );
  TestValidator.equals(
    "parameter id exists",
    retrievedReport.parameter.id !== undefined,
    true,
  );
  TestValidator.equals(
    "start_date matches",
    retrievedReport.parameter.start_date,
    report.parameter.start_date,
  );
  TestValidator.equals(
    "end_date matches",
    retrievedReport.parameter.end_date,
    report.parameter.end_date,
  );
  TestValidator.equals(
    "group_by matches",
    retrievedReport.parameter.group_by,
    report.parameter.group_by,
  );
}
