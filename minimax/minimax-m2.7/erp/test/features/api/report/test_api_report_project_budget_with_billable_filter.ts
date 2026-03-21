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

export async function test_api_report_project_budget_with_billable_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Note: In production, organizationId would come from test fixtures or prior setup
  // For this test, using a generated UUID
  const organizationId =
    `${RandomGenerator.alphaNumeric(8)}-${RandomGenerator.alphaNumeric(4)}-${RandomGenerator.alphaNumeric(4)}-${RandomGenerator.alphaNumeric(4)}-${RandomGenerator.alphaNumeric(12)}` as string &
      tags.Format<"uuid">;
  // 2. Create a project budget report with billable=true filter and group_by='task'
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date();
  const report =
    await api.functional.erpHrm.member.organizations.reports.create(
      memberConnection,
      {
        organizationId: organizationId,
        body: {
          report_type: "project_budget_report",
          parameter: {
            billable: true,
            group_by: "task",
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
          } satisfies IErpHrmReportParameter.ICreate,
        } satisfies IErpHrmReport.ICreate,
      },
    );
  // 3. Validate response structure
  typia.assert(report);
  // 4. Verify the billable filter is stored correctly in report parameters
  TestValidator.equals(
    "billable filter should be true",
    report.parameter.billable,
    true,
  );
  // 5. Confirm report_type='project_budget_report' is set correctly
  TestValidator.equals(
    "report_type should be project_budget_report",
    report.report_type,
    "project_budget_report",
  );
  // 6. Verify task grouping is applied to the report output
  TestValidator.equals(
    "group_by should be task",
    report.parameter.group_by,
    "task",
  );
}
