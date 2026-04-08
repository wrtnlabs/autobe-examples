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
import { generate_random_erp_hrm_admin_reports_create } from "../../../generate/generate_random_erp_hrm_admin_reports_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";

export async function test_api_report_project_budget_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create date range for the report (spanning one month)
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];
  // 3. Create project_budget_report
  const report = await api.functional.erpHrm.admin.reports.create(
    adminConnection,
    {
      body: {
        reportType: "project_budget_report",
        startDate: startDateStr,
        endDate: endDateStr,
      } satisfies IErpHrmReport.ICreate,
    },
  );
  typia.assert(report);
  // 4. Validate report type
  TestValidator.equals(
    "report type is project_budget_report",
    report.reportType,
    "project_budget_report",
  );
  // 5. Validate date range in parameters
  const param = report.parameter;
  const startDateISO = new Date(startDateStr).toISOString();
  const endDateISO = new Date(endDateStr).toISOString();
  TestValidator.equals(
    "start date in parameter",
    param.start_date,
    startDateISO,
  );
  TestValidator.equals("end date in parameter", param.end_date, endDateISO);
  // 6. Validate organization context scope
  TestValidator.equals("organization exists", !!report.organization, true);
  TestValidator.predicate(
    "organization has valid data",
    !!report.organization.id,
  );
}
