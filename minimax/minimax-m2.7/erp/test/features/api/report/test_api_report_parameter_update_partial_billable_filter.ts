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

export async function test_api_report_parameter_update_partial_billable_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Create authenticated connection for the member
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 2. Create a report with initial parameters including billable: null
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();
  const report =
    await api.functional.erpHrm.member.organizations.reports.create(
      memberAuthConnection,
      {
        organizationId: authorized.token.access as any,
        body: {
          report_type: "time_report",
          name: "Initial Report",
          parameter: {
            billable: null,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            group_by: "employee",
          } satisfies IErpHrmReportParameter.ICreate,
        } satisfies IErpHrmReport.ICreate,
      },
    );
  typia.assert(report);
  // Store original parameter values for comparison
  const originalStartDate = report.parameter.start_date;
  const originalEndDate = report.parameter.end_date;
  const originalGroupBy = report.parameter.group_by;
  const originalUpdatedAt = report.parameter.updated_at;
  // 3. Update only the billable filter via PUT request body with billable: false
  const updatedParameter =
    await api.functional.erpHrm.member.organizations.reports.parameters.update(
      memberAuthConnection,
      {
        organizationId: report.organization.id,
        reportId: report.id,
        body: {
          billable: false,
        } satisfies IErpHrmReportParameter.IUpdate,
      },
    );
  typia.assert(updatedParameter);
  // 4. Validate the response
  // - billable changed to false
  TestValidator.equals(
    "billable should be false",
    updatedParameter.billable,
    false,
  );
  // - Other parameters preserved from original creation
  TestValidator.equals(
    "start_date should be preserved",
    updatedParameter.start_date,
    originalStartDate,
  );
  TestValidator.equals(
    "end_date should be preserved",
    updatedParameter.end_date,
    originalEndDate,
  );
  TestValidator.equals(
    "group_by should be preserved",
    updatedParameter.group_by,
    originalGroupBy,
  );
  // - updated_at timestamp updated (should be newer than or equal to original)
  const originalTime = new Date(originalUpdatedAt!).getTime();
  const updatedTime = new Date(updatedParameter.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should be updated",
    updatedTime >= originalTime,
  );
}
