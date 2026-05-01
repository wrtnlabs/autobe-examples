import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectBudgetReport";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

/**
 * Validates the project budget report correctly computes utilization_percentage above 100% when actual logged hours exceed the budgeted estimate.
 *
 * Confirms that budget hours serve as a comparison baseline, not a hard cap on logged time. The test creates a project with a tight 10-hour budget, logs 10 hours to reach the exact budget, then logs an additional 15 hours to push well over. The resulting report must show actual_hours=25 and utilization_percentage=250.0 — proving the percentage is not clamped at 100%.
 *
 * The summary totals are also validated to ensure the organization-wide aggregation reflects the over-budget reality: total_budget_hours=10, total_actual_hours=25, overall_utilization=250.0.
 *
 * 1. A member joins and authenticates via authorize_member_join.
 * 2. A project is created with budget_hours set to exactly 10.
 * 3. A first timelog of 600 minutes (10 hours) is logged, reaching the budget.
 * 4. A second timelog of 900 minutes (15 hours) is logged, pushing to 25 total.
 * 5. The project budget report is fetched and validated for over-budget computation.
 */
export async function test_api_project_budget_report_over_budget(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project with a tight budget of 10 hours
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    { body: { budget_hours: 10 } },
  );
  typia.assert(project);
  // 3. Log 10 hours (600 minutes) — reaching the exact budget
  const dateStr = new Date().toISOString().split("T")[0];
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    { body: { project_id: project.id, date: dateStr, duration_minutes: 600 } },
  );
  typia.assert(timelog1);
  // 4. Log additional 15 hours (900 minutes) — 25 total, well over budget
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    { body: { project_id: project.id, date: dateStr, duration_minutes: 900 } },
  );
  typia.assert(timelog2);
  // 5. Fetch the project budget report
  const report =
    await api.functional.erpHrm.member.reports.project_budget.at(
      memberConnection,
    );
  typia.assert(report);
  // 6. Validate per-project item
  const projectItem = report.projects.find((p) => p.project_id === project.id);
  TestValidator.predicate(
    "project appears in report",
    projectItem !== undefined,
  );
  if (projectItem) {
    TestValidator.equals(
      "budget hours unchanged",
      projectItem.budget_hours,
      10,
    );
    TestValidator.equals("actual hours total 25", projectItem.actual_hours, 25);
    TestValidator.equals(
      "utilization is 250 percent (not capped)",
      projectItem.utilization_percentage,
      250.0,
    );
  }
  // 7. Validate summary totals
  TestValidator.equals(
    "total budget hours",
    report.summary.total_budget_hours,
    10,
  );
  TestValidator.equals(
    "total actual hours",
    report.summary.total_actual_hours,
    25,
  );
  TestValidator.equals(
    "overall utilization 250 percent",
    report.summary.overall_utilization,
    250.0,
  );
}
