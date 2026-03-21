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

export async function test_api_report_filtering_by_type_and_date(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to set up organization context
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Step 2: Authenticate as member to access report listing
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    },
  });
  typia.assert(memberAuth);
  // Step 3: Create multiple reports of different types
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const timeReport =
    await generate_random_erp_hrm_member_organizations_reports_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          report_type: "time_report",
          name: "Time Report Test",
          parameter: {
            start_date: new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            end_date: new Date().toISOString(),
            group_by: "employee",
          },
        },
      },
    );
  typia.assert(timeReport);
  const budgetReport =
    await generate_random_erp_hrm_member_organizations_reports_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          report_type: "project_budget_report",
          name: "Budget Report Test",
          parameter: {
            start_date: new Date(
              Date.now() - 60 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            end_date: new Date().toISOString(),
            group_by: "project",
          },
        },
      },
    );
  typia.assert(budgetReport);
  const weeklyReport =
    await generate_random_erp_hrm_member_organizations_reports_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          report_type: "weekly_summary_report",
          name: "Weekly Summary Test",
          parameter: {
            start_date: new Date(
              Date.now() - 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            end_date: new Date().toISOString(),
            group_by: "task",
          },
        },
      },
    );
  typia.assert(weeklyReport);
  // Step 4: Filter by report_type = 'time_report'
  const timeReportFilter =
    await api.functional.erpHrm.member.organizations.reports.index(
      memberConnection,
      {
        organizationId,
        body: {
          report_type: "time_report",
        },
      },
    );
  typia.assert(timeReportFilter);
  TestValidator.equals(
    "only time_report type",
    timeReportFilter.data.every((r) => r.report_type === "time_report"),
    true,
  );
  TestValidator.predicate(
    "has at least one time_report",
    timeReportFilter.data.length >= 1,
  );
  // Step 5: Filter by name with partial match
  const nameFilter =
    await api.functional.erpHrm.member.organizations.reports.index(
      memberConnection,
      {
        organizationId,
        body: {
          name: "Budget",
        },
      },
    );
  typia.assert(nameFilter);
  TestValidator.equals(
    "reports contain 'Budget' in name",
    nameFilter.data.every((r) => r.name?.includes("Budget")),
    true,
  );
  TestValidator.predicate(
    "has at least one budget report",
    nameFilter.data.length >= 1,
  );
  // Step 6: Filter by date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeFilter =
    await api.functional.erpHrm.member.organizations.reports.index(
      memberConnection,
      {
        organizationId,
        body: {
          start_date: thirtyDaysAgo.toISOString(),
          end_date: now.toISOString(),
        },
      },
    );
  typia.assert(dateRangeFilter);
  dateRangeFilter.data.forEach((report) => {
    const createdAt = new Date(report.created_at);
    TestValidator.predicate(
      "report within date range",
      createdAt >= thirtyDaysAgo && createdAt <= now,
    );
  });
  // Step 7: Combined filters (report_type + name)
  const combinedFilter =
    await api.functional.erpHrm.member.organizations.reports.index(
      memberConnection,
      {
        organizationId,
        body: {
          report_type: "time_report",
          name: "Test",
        },
      },
    );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined filters: time_report with 'Test'",
    combinedFilter.data.every(
      (r) => r.report_type === "time_report" && r.name?.includes("Test"),
    ),
    true,
  );
  // Step 8: Validate generatedByMember is populated
  const allReports =
    await api.functional.erpHrm.member.organizations.reports.index(
      memberConnection,
      {
        organizationId,
        body: {},
      },
    );
  typia.assert(allReports);
  allReports.data.forEach((report) => {
    TestValidator.predicate(
      "generatedByMember populated",
      report.generatedByMember !== null,
    );
    TestValidator.predicate(
      "generatedByMember has id",
      report.generatedByMember.id !== undefined,
    );
    TestValidator.predicate(
      "generatedByMember has email",
      report.generatedByMember.email !== undefined,
    );
  });
}
