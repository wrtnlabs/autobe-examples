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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_organizations_reports_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_reports_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";
import { prepare_random_erp_hrm_report_parameter } from "../../../prepare/prepare_random_erp_hrm_report_parameter";

export async function test_api_report_weekly_summary_single_day(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create a weekly summary report with single-day date range
  const today = new Date();
  const startDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    0,
    0,
    0,
  );
  const endDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
  );
  // Generate report with organization context from admin session
  const report =
    await generate_random_erp_hrm_admin_organizations_reports_create(
      adminConnection,
      {
        params: {
          organizationId:
            (admin as any).erpHrmOrganizationId ??
            (admin as any).organization?.id ??
            typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          report_type: "weekly_summary_report",
          name: `Single Day Report - ${today.toISOString().split("T")[0]}`,
          parameter: {
            start_date: startDate.toISOString() as string &
              tags.Format<"date-time">,
            end_date: endDate.toISOString() as string &
              tags.Format<"date-time">,
            group_by: "task",
          },
        },
      },
    );
  typia.assert(report);
  // 3. Validate report creation
  TestValidator.equals(
    "report type is weekly_summary_report",
    report.report_type,
    "weekly_summary_report",
  );
  TestValidator.equals(
    "report has parameters",
    report.parameter !== null,
    true,
  );
  // Validate single-day date range
  const reportStartDate = report.parameter.start_date.split("T")[0];
  const reportEndDate = report.parameter.end_date.split("T")[0];
  TestValidator.equals(
    "start_date and end_date are same day",
    reportStartDate,
    reportEndDate,
  );
  TestValidator.equals("group_by is task", report.parameter.group_by, "task");
}
