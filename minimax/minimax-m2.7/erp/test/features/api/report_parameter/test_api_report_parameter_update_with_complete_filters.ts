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

export async function test_api_report_parameter_update_with_complete_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Get organization ID from active timers if available, otherwise use random UUID
  let organizationId: string;
  if (authorized.activeTimers.length > 0) {
    organizationId = authorized.activeTimers[0].project.organization.id;
  } else {
    organizationId = typia.random<string & tags.Format<"uuid">>();
  }
  // 3. Create a report with initial parameters
  const report =
    await generate_random_erp_hrm_member_organizations_reports_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          report_type: "time_report",
          name: RandomGenerator.paragraph({ sentences: 1 }),
          parameter: {
            start_date: new Date("2024-01-01T00:00:00Z").toISOString(),
            end_date: new Date("2024-01-31T23:59:59Z").toISOString(),
            group_by: "project",
          },
        },
      },
    );
  typia.assert(report);
  // 4. Update the report parameters with complete filters
  const newStartDate = new Date("2024-02-01T00:00:00Z").toISOString();
  const newEndDate = new Date("2024-02-28T23:59:59Z").toISOString();
  const updatedParameter =
    await api.functional.erpHrm.member.organizations.reports.parameters.update(
      memberConnection,
      {
        organizationId: report.organization.id,
        reportId: report.id,
        body: {
          start_date: newStartDate,
          end_date: newEndDate,
          group_by: "employee",
          billable: true,
        } satisfies IErpHrmReportParameter.IUpdate,
      },
    );
  typia.assert(updatedParameter);
  // 5. Validate the response
  TestValidator.equals(
    "start_date updated correctly",
    updatedParameter.start_date,
    newStartDate,
  );
  TestValidator.equals(
    "end_date updated correctly",
    updatedParameter.end_date,
    newEndDate,
  );
  TestValidator.equals(
    "group_by changed to employee",
    updatedParameter.group_by,
    "employee",
  );
  TestValidator.equals("billable set to true", updatedParameter.billable, true);
  TestValidator.predicate(
    "updated_at timestamp is recent",
    new Date(updatedParameter.updated_at).getTime() > Date.now() - 60000,
  );
  TestValidator.equals(
    "report relationship preserved",
    updatedParameter.report.id,
    report.id,
  );
}
