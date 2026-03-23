import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test generating a budget consumption report with date range filters to analyze budget consumption over a specific period.
 *
 * This test validates that the budget report correctly filters timelogs by date range
 * and calculates budget metrics (actual hours, remaining hours, consumption percentage)
 * based on the filtered timelog data.
 */
export async function test_api_project_budget_report_with_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project with budget_hours set to 200 hours
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        budget_hours: 200,
      },
    },
  );
  typia.assert(project);
  // 3. Generate date range for filtering (test with a specific date range)
  const today = new Date();
  const startDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 30,
  )
    .toISOString()
    .split("T")[0];
  const endDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
    .toISOString()
    .split("T")[0];
  // 4. Call the budget report endpoint with date filters
  const report =
    await api.functional.hrmPlatform.member.projects.budget_report.budgetReport(
      memberConnection,
      {
        projectId: project.id,
        body: {
          startDate,
          endDate,
        } satisfies IHrmPlatformProject.IBudgetReportRequest,
      },
    );
  typia.assert(report);
  // 5. Validate the budget report response
  TestValidator.equals("project id matches", report.id, project.id);
  TestValidator.equals("project name matches", report.name, project.name);
  TestValidator.equals("budget hours matches", report.budget_hours, 200);
  TestValidator.predicate(
    "actual hours is non-negative",
    report.actual_hours >= 0,
  );
  TestValidator.predicate(
    "actual hours is number",
    typeof report.actual_hours === "number",
  );
  // Validate budget calculations
  if (report.budget_hours !== null) {
    TestValidator.equals(
      "remaining hours calculation",
      report.remaining_hours,
      report.budget_hours - report.actual_hours,
    );
    TestValidator.equals(
      "consumption percentage calculation",
      report.consumption_percentage,
      (report.actual_hours / report.budget_hours) * 100,
    );
    TestValidator.equals(
      "is over budget flag",
      report.is_over_budget,
      report.actual_hours > report.budget_hours,
    );
  }
  // 6. Test without date filters (should include all timelogs)
  const fullReport =
    await api.functional.hrmPlatform.member.projects.budget_report.budgetReport(
      memberConnection,
      {
        projectId: project.id,
        body: {} satisfies IHrmPlatformProject.IBudgetReportRequest,
      },
    );
  typia.assert(fullReport);
  // Validate full report structure
  TestValidator.equals("full report project id", fullReport.id, project.id);
  TestValidator.equals(
    "full report budget hours",
    fullReport.budget_hours,
    200,
  );
  TestValidator.predicate(
    "full report actual hours is non-negative",
    fullReport.actual_hours >= 0,
  );
}
