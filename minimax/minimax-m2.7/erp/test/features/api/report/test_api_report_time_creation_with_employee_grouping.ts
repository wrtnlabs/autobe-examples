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

export async function test_api_report_time_creation_with_employee_grouping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate work week dates (Monday to Sunday)
  const today = new Date("2026-04-02T12:34:42.117Z");
  const dayOfWeek = today.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const startDate = monday.toISOString().split("T")[0];
  const endDate = sunday.toISOString().split("T")[0];
  // 3. Create time report with employee grouping
  const report = await generate_random_erp_hrm_admin_reports_create(
    adminConnection,
    {
      body: {
        reportType: "time_report",
        startDate: startDate as string & tags.Format<"date">,
        endDate: endDate as string & tags.Format<"date">,
        groupBy: "employee",
        billable: null,
      },
    },
  );
  typia.assert(report);
  // 4. Validate response structure
  TestValidator.equals(
    "report type is time_report",
    report.reportType,
    "time_report",
  );
  TestValidator.equals(
    "group_by is employee",
    report.parameter.group_by,
    "employee",
  );
  TestValidator.equals("billable is null", report.parameter.billable, null);
  TestValidator.equals(
    "start_date matches",
    report.parameter.start_date.startsWith(startDate),
    true,
  );
  TestValidator.equals(
    "end_date matches",
    report.parameter.end_date.startsWith(endDate),
    true,
  );
  TestValidator.predicate(
    "has generatedByMember",
    report.generatedByMember !== null,
  );
  TestValidator.predicate("has organization", report.organization !== null);
}
