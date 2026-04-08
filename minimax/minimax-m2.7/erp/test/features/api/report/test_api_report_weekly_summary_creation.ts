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

export async function test_api_report_weekly_summary_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create weekly summary report with date range covering multiple weeks
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const startDate = fourWeeksAgo.toISOString().split("T")[0];
  const endDate = now.toISOString().split("T")[0];
  const reportName = RandomGenerator.paragraph({ sentences: 2 });
  const report = await api.functional.erpHrm.admin.reports.create(
    adminConnection,
    {
      body: {
        reportType: "weekly_summary_report",
        name: reportName,
        startDate: startDate,
        endDate: endDate,
      } satisfies IErpHrmReport.ICreate,
    },
  );
  typia.assert(report);
  // 3. Validate response structure
  TestValidator.equals(
    "report type is weekly_summary_report",
    report.reportType,
    "weekly_summary_report",
  );
  TestValidator.equals("report name matches input", report.name, reportName);
  TestValidator.predicate(
    "parameter exists",
    report.parameter !== null && report.parameter !== undefined,
  );
  TestValidator.predicate(
    "parameter has start_date",
    report.parameter.start_date !== null &&
      report.parameter.start_date !== undefined,
  );
  TestValidator.predicate(
    "parameter has end_date",
    report.parameter.end_date !== null &&
      report.parameter.end_date !== undefined,
  );
}
