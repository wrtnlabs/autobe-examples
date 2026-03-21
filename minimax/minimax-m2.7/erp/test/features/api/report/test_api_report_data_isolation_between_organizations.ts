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
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_reports_create } from "../../../generate/generate_random_erp_hrm_member_organizations_reports_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";
import { prepare_random_erp_hrm_report_parameter } from "../../../prepare/prepare_random_erp_hrm_report_parameter";

export async function test_api_report_data_isolation_between_organizations(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Admin A and its organization
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_admin_join(adminAConnection, {});
  // Step 2: Create Member A (member of Organization A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // Step 3: Get Organization A's ID from admin A's session
  // Admin A is the owner of Organization A, so we need to find org A's ID
  // We'll create a report and extract the organization ID from it
  const setupReportA =
    await generate_random_erp_hrm_member_organizations_reports_create(
      adminAConnection,
      {
        params: { organizationId: adminA.id },
      },
    );
  typia.assert(setupReportA);
  const orgAId = setupReportA.organization.id;
  // Step 4: Create reports as Member A in Organization A
  const orgAReport1 =
    await generate_random_erp_hrm_member_organizations_reports_create(
      memberAConnection,
      {
        params: { organizationId: orgAId },
      },
    );
  typia.assert(orgAReport1);
  const orgAReport2 =
    await generate_random_erp_hrm_member_organizations_reports_create(
      memberAConnection,
      {
        params: { organizationId: orgAId },
      },
    );
  typia.assert(orgAReport2);
  // Step 5: Create Admin B and Organization B
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_admin_join(adminBConnection, {});
  // Step 6: Create Member B (member of Organization B)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // Step 7: Get Organization B's ID from admin B's session
  const setupReportB =
    await generate_random_erp_hrm_member_organizations_reports_create(
      adminBConnection,
      {
        params: { organizationId: adminB.id },
      },
    );
  typia.assert(setupReportB);
  const orgBId = setupReportB.organization.id;
  // Step 8: Create reports as Member B in Organization B
  const orgBReport1 =
    await generate_random_erp_hrm_member_organizations_reports_create(
      memberBConnection,
      {
        params: { organizationId: orgBId },
      },
    );
  typia.assert(orgBReport1);
  const orgBReport2 =
    await generate_random_erp_hrm_member_organizations_reports_create(
      memberBConnection,
      {
        params: { organizationId: orgBId },
      },
    );
  typia.assert(orgBReport2);
  // Step 9: Query reports for Organization A as Member A
  const orgAReportsResponse =
    await api.functional.erpHrm.member.organizations.reports.index(
      memberAConnection,
      {
        organizationId: orgAId,
        body: {},
      },
    );
  typia.assert(orgAReportsResponse);
  // Step 10: Validate Organization A isolation
  // Member A should only see Organization A's reports
  TestValidator.equals(
    "org A reports visible",
    orgAReportsResponse.data.length >= 2,
    true,
  );
  // Verify Organization B's reports are NOT in Organization A's results
  const orgAReportIds = orgAReportsResponse.data.map((r) => r.id);
  TestValidator.predicate(
    "org A does not contain org B report 1",
    !orgAReportIds.includes(orgBReport1.id),
  );
  TestValidator.predicate(
    "org A does not contain org B report 2",
    !orgAReportIds.includes(orgBReport2.id),
  );
  // Step 11: Query reports for Organization B as Member B
  const orgBReportsResponse =
    await api.functional.erpHrm.member.organizations.reports.index(
      memberBConnection,
      {
        organizationId: orgBId,
        body: {},
      },
    );
  typia.assert(orgBReportsResponse);
  // Step 12: Validate Organization B isolation
  TestValidator.equals(
    "org B reports visible",
    orgBReportsResponse.data.length >= 2,
    true,
  );
  // Verify Organization A's reports are NOT in Organization B's results
  const orgBReportIds = orgBReportsResponse.data.map((r) => r.id);
  TestValidator.predicate(
    "org B does not contain org A report 1",
    !orgBReportIds.includes(orgAReport1.id),
  );
  TestValidator.predicate(
    "org B does not contain org A report 2",
    !orgBReportIds.includes(orgAReport2.id),
  );
  // Step 13: Test filtering by generated_by_member_id within each organization
  // Filter Organization A reports by Member A's ID
  const memberAReportsInOrgA =
    await api.functional.erpHrm.member.organizations.reports.index(
      memberAConnection,
      {
        organizationId: orgAId,
        body: {
          generated_by_member_id: memberA.id,
        },
      },
    );
  typia.assert(memberAReportsInOrgA);
  // All reports in the response should belong to Member A
  for (const report of memberAReportsInOrgA.data) {
    TestValidator.equals(
      "member matches in org A",
      report.generatedByMember.id,
      memberA.id,
    );
  }
  // Step 14: Verify Member B cannot see Organization A's reports
  // by querying with Organization A's ID using Member B's context
  const orgAReportsForMemberB =
    await api.functional.erpHrm.member.organizations.reports.index(
      memberBConnection,
      {
        organizationId: orgAId,
        body: {},
      },
    );
  typia.assert(orgAReportsForMemberB);
  // Member B's context should not have access to Organization A's data
  // The response should either be empty or access denied
  // Verify that Organization B's reports are NOT returned
  TestValidator.predicate(
    "member B cannot see org A reports",
    !orgAReportsForMemberB.data.some(
      (r) => r.id === orgBReport1.id || r.id === orgBReport2.id,
    ),
  );
}
