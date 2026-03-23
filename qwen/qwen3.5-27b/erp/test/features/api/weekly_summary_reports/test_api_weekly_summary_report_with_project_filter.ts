import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIWeeklySummaryReport";
import type { IWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeeklySummaryReport";
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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

export async function test_api_weekly_summary_report_with_project_filter(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test weekly summary report with project filtering.
   * 1. Admin authenticates
   * 2. Admin creates a project
   * 3. Admin requests weekly summary report with project_id filter
   * 4. Verify response structure and pagination
   */
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a project to filter by
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Request weekly summary report with project filter
  const today = new Date();
  const startDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 30,
  );
  const endDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const report =
    await api.functional.hrmPlatform.admin.weekly_summary_reports.index(
      adminConnection,
      {
        body: {
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          project_id: project.id,
          page: 1,
          limit: 20,
        } satisfies IWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(report);
  // 4. Verify response structure
  TestValidator.equals(
    "pagination exists",
    report.pagination !== undefined,
    true,
  );
  TestValidator.equals("data is array", Array.isArray(report.data), true);
  // 5. Verify pagination fields
  TestValidator.equals("current page is 1", report.pagination.current, 1);
  TestValidator.equals("limit is 20", report.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    report.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    report.pagination.pages >= 0,
  );
  // 6. Verify each weekly summary has valid structure
  await ArrayUtil.asyncForEach(report.data, async (weeklySummary, index) => {
    typia.assert(weeklySummary);
    TestValidator.predicate(
      `weekly summary ${index} has valid week_start_date`,
      /^\d{4}-\d{2}-\d{2}$/.test(weeklySummary.week_start_date),
    );
    TestValidator.predicate(
      `weekly summary ${index} has valid week_end_date`,
      /^\d{4}-\d{2}-\d{2}$/.test(weeklySummary.week_end_date),
    );
    TestValidator.predicate(
      `weekly summary ${index} total_hours is non-negative`,
      weeklySummary.total_hours >= 0,
    );
    TestValidator.predicate(
      `weekly summary ${index} timelog_count is non-negative`,
      weeklySummary.timelog_count >= 0,
    );
    TestValidator.predicate(
      `weekly summary ${index} employee_count is non-negative`,
      weeklySummary.employee_count >= 0,
    );
    // Verify week_end_date is 6 days after week_start_date
    const weekStart = new Date(weeklySummary.week_start_date);
    const weekEnd = new Date(weeklySummary.week_end_date);
    const diffDays = Math.floor(
      (weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    TestValidator.equals(
      `weekly summary ${index} week duration is 6 days`,
      diffDays,
      6,
    );
  });
  // 7. Verify results are sorted by week_start_date descending
  if (report.data.length > 1) {
    for (let i = 0; i < report.data.length - 1; i++) {
      const currentWeek = report.data[i].week_start_date;
      const nextWeek = report.data[i + 1].week_start_date;
      TestValidator.predicate(
        `results are sorted descending at index ${i}`,
        currentWeek >= nextWeek,
      );
    }
  }
}
