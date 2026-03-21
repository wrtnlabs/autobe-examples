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

export async function test_api_report_weekly_summary_with_employee_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to establish session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Get organization ID from member's context
  // Member should have access to their organization for report creation
  // Extract organizationId from activeTimers if available, or use first organization context
  const organizationId =
    authorized.activeTimers?.[0]?.project?.organization?.id;
  // 3. Create a weekly summary report with employee filter using group_by='employee'
  const report =
    await generate_random_erp_hrm_member_organizations_reports_create(
      memberConnection,
      {
        body: {
          report_type: "weekly_summary_report",
          parameter: {
            group_by: "employee",
            start_date: new Date(
              Date.now() - 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            end_date: new Date().toISOString(),
          },
        },
        params: {
          organizationId: organizationId!,
        },
      },
    );
  typia.assert(report);
  // 4. Validate response structure
  TestValidator.equals(
    "report type is weekly_summary_report",
    report.report_type,
    "weekly_summary_report",
  );
  // 5. Verify the report includes employee filter in parameters
  TestValidator.equals(
    "group_by is employee",
    report.parameter.group_by,
    "employee",
  );
  // 6. Validate that the report's organization matches the expected organization
  TestValidator.equals(
    "organization matches",
    report.organization.id,
    organizationId,
  );
}
