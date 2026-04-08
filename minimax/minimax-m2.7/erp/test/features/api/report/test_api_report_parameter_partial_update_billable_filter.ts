import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
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
import { generate_random_erp_hrm_admin_reports_create } from "../../../generate/generate_random_erp_hrm_admin_reports_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";

export async function test_api_report_parameter_partial_update_billable_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Create a report with full parameters including groupBy='employee'
  const report = await generate_random_erp_hrm_admin_reports_create(
    adminConnection,
    {
      body: {
        reportType: "time_report",
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        groupBy: "employee",
      },
    },
  );
  typia.assert(report);
  // Store the original groupBy value
  const originalGroupBy = report.parameter.group_by;
  TestValidator.equals(
    "groupBy should be employee initially",
    originalGroupBy,
    "employee",
  );
  // 3. Update only the billable filter using PATCH
  const updatedReport =
    await api.functional.erpHrm.member.reports.parameters.update(
      adminConnection,
      {
        reportId: report.id,
        body: {
          billable: false,
        } satisfies IErpHrmReportParameter.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 4. Validate that groupBy remains 'employee' (unchanged) and only billable is updated
  TestValidator.equals(
    "groupBy should remain employee after partial update",
    updatedReport.parameter.group_by,
    "employee",
  );
  TestValidator.equals(
    "billable should be updated to false",
    updatedReport.parameter.billable,
    false,
  );
  // 5. Test changing billable back to null to include all entries
  const finalReport =
    await api.functional.erpHrm.member.reports.parameters.update(
      adminConnection,
      {
        reportId: report.id,
        body: {
          billable: null,
        } satisfies IErpHrmReportParameter.IUpdate,
      },
    );
  typia.assert(finalReport);
  // 6. Validate final state
  TestValidator.equals(
    "groupBy should still be employee",
    finalReport.parameter.group_by,
    "employee",
  );
  TestValidator.equals(
    "billable should be null",
    finalReport.parameter.billable,
    null,
  );
}
