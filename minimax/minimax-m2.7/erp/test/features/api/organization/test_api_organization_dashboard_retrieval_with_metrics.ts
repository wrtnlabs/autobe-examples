import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving the organization dashboard with aggregate metrics as an authenticated admin.
 *
 * Steps:
 * 1. Create a new admin account via POST /erpHrm/auth/admin/join to obtain JWT tokens
 * 2. Verify the admin has access to the dashboard endpoint
 * 3. Validate the response contains all expected dashboard sections:
 *    - Organization summary with basic info (name, employee_count, currency, timezone)
 *    - Employee statistics showing breakdown by status (active/deactivated) and employment_type (full_time/part_time/contractor/intern)
 *    - Project overview with counts by status (active/archived/completed) and budget utilization metrics
 *    - Task metrics with breakdowns by status (open/in_progress/completed/closed) and priority (low/medium/high/urgent), plus completion_rate
 *    - Time tracking data including hours_logged_this_week, hours_logged_this_month, billable_hours, non_billable_hours, average_daily_hours
 *    - Recent activity array containing the last 10 activity log entries with member info
 * 4. Confirm all numeric values are properly calculated and formatted
 * 5. Verify recent activity entries show correct action types and member references
 */
export async function test_api_organization_dashboard_retrieval_with_metrics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and get authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Retrieve organization dashboard
  const dashboard =
    await api.functional.erpHrm.admin.organizations.dashboard.at(
      adminConnection,
      {
        organizationId: admin.id,
      },
    );
  typia.assert(dashboard);
  // 3. Validate organization summary section
  TestValidator.equals(
    "organization exists",
    dashboard.organization !== undefined,
    true,
  );
  TestValidator.equals(
    "organization has valid id",
    dashboard.organization.id !== undefined,
    true,
  );
  TestValidator.equals(
    "organization has name",
    typeof dashboard.organization.name === "string",
    true,
  );
  TestValidator.equals(
    "employee count is non-negative",
    dashboard.organization.employee_count >= 0,
    true,
  );
  TestValidator.equals(
    "organization has currency",
    typeof dashboard.organization.currency === "string",
    true,
  );
  TestValidator.equals(
    "organization has timezone",
    typeof dashboard.organization.timezone === "string",
    true,
  );
  // 4. Validate employee statistics section
  TestValidator.equals(
    "employee statistics exists",
    dashboard.employeeStatistics !== undefined,
    true,
  );
  TestValidator.equals(
    "total count is non-negative",
    dashboard.employeeStatistics.total_count >= 0,
    true,
  );
  TestValidator.equals(
    "active count is non-negative",
    dashboard.employeeStatistics.by_status.active >= 0,
    true,
  );
  TestValidator.equals(
    "deactivated count is non-negative",
    dashboard.employeeStatistics.by_status.deactivated >= 0,
    true,
  );
  TestValidator.equals(
    "full_time count is non-negative",
    dashboard.employeeStatistics.by_employment_type.full_time >= 0,
    true,
  );
  TestValidator.equals(
    "part_time count is non-negative",
    dashboard.employeeStatistics.by_employment_type.part_time >= 0,
    true,
  );
  TestValidator.equals(
    "contractor count is non-negative",
    dashboard.employeeStatistics.by_employment_type.contractor >= 0,
    true,
  );
  TestValidator.equals(
    "intern count is non-negative",
    dashboard.employeeStatistics.by_employment_type.intern >= 0,
    true,
  );
  // 5. Validate project overview section
  TestValidator.equals(
    "project overview exists",
    dashboard.projectOverview !== undefined,
    true,
  );
  TestValidator.equals(
    "total project count is non-negative",
    dashboard.projectOverview.total_count >= 0,
    true,
  );
  TestValidator.equals(
    "active projects is non-negative",
    dashboard.projectOverview.by_status.active >= 0,
    true,
  );
  TestValidator.equals(
    "archived projects is non-negative",
    dashboard.projectOverview.by_status.archived >= 0,
    true,
  );
  TestValidator.equals(
    "completed projects is non-negative",
    dashboard.projectOverview.by_status.completed >= 0,
    true,
  );
  TestValidator.predicate(
    "budget hours can be null or non-negative",
    dashboard.projectOverview.total_budget_hours === null ||
      dashboard.projectOverview.total_budget_hours >= 0,
  );
  TestValidator.predicate(
    "utilized budget hours can be null or non-negative",
    dashboard.projectOverview.utilized_budget_hours === null ||
      dashboard.projectOverview.utilized_budget_hours >= 0,
  );
  TestValidator.predicate(
    "budget utilization can be null or between 0-100",
    dashboard.projectOverview.budget_utilization_percentage === null ||
      (dashboard.projectOverview.budget_utilization_percentage >= 0 &&
        dashboard.projectOverview.budget_utilization_percentage <= 100),
  );
  // 6. Validate task metrics section
  TestValidator.equals(
    "task metrics exists",
    dashboard.taskMetrics !== undefined,
    true,
  );
  TestValidator.equals(
    "total task count is non-negative",
    dashboard.taskMetrics.total_count >= 0,
    true,
  );
  TestValidator.equals(
    "open tasks is non-negative",
    dashboard.taskMetrics.by_status.open >= 0,
    true,
  );
  TestValidator.equals(
    "in_progress tasks is non-negative",
    dashboard.taskMetrics.by_status.in_progress >= 0,
    true,
  );
  TestValidator.equals(
    "completed tasks is non-negative",
    dashboard.taskMetrics.by_status.completed >= 0,
    true,
  );
  TestValidator.equals(
    "closed tasks is non-negative",
    dashboard.taskMetrics.by_status.closed >= 0,
    true,
  );
  TestValidator.equals(
    "low priority is non-negative",
    dashboard.taskMetrics.by_priority.low >= 0,
    true,
  );
  TestValidator.equals(
    "medium priority is non-negative",
    dashboard.taskMetrics.by_priority.medium >= 0,
    true,
  );
  TestValidator.equals(
    "high priority is non-negative",
    dashboard.taskMetrics.by_priority.high >= 0,
    true,
  );
  TestValidator.equals(
    "urgent priority is non-negative",
    dashboard.taskMetrics.by_priority.urgent >= 0,
    true,
  );
  TestValidator.predicate(
    "completion rate is between 0-100",
    dashboard.taskMetrics.completion_rate >= 0 &&
      dashboard.taskMetrics.completion_rate <= 100,
  );
  // 7. Validate time tracking section
  TestValidator.equals(
    "time tracking exists",
    dashboard.timeTracking !== undefined,
    true,
  );
  TestValidator.predicate(
    "hours logged this week is non-negative",
    dashboard.timeTracking.hours_logged_this_week >= 0,
  );
  TestValidator.predicate(
    "hours logged this month is non-negative",
    dashboard.timeTracking.hours_logged_this_month >= 0,
  );
  TestValidator.predicate(
    "billable hours is non-negative",
    dashboard.timeTracking.billable_hours >= 0,
  );
  TestValidator.predicate(
    "non billable hours is non-negative",
    dashboard.timeTracking.non_billable_hours >= 0,
  );
  TestValidator.predicate(
    "average daily hours is non-negative",
    dashboard.timeTracking.average_daily_hours >= 0,
  );
  // 8. Validate recent activity section
  TestValidator.equals(
    "recent activity exists",
    dashboard.recentActivity !== undefined,
    true,
  );
  TestValidator.predicate(
    "recent activity has at most 10 entries",
    dashboard.recentActivity.length <= 10,
  );
  for (const activity of dashboard.recentActivity) {
    TestValidator.equals(
      "activity has valid id",
      activity.id !== undefined,
      true,
    );
    TestValidator.equals(
      "activity has action type",
      typeof activity.action_type === "string",
      true,
    );
    TestValidator.equals(
      "activity has target entity type",
      typeof activity.target_entity_type === "string",
      true,
    );
    TestValidator.equals(
      "activity has target entity id",
      activity.target_entity_id !== undefined,
      true,
    );
    TestValidator.equals(
      "activity has member info",
      activity.member !== undefined,
      true,
    );
    TestValidator.equals(
      "member has valid id",
      activity.member.id !== undefined,
      true,
    );
    TestValidator.equals(
      "member has email",
      typeof activity.member.email === "string",
      true,
    );
    TestValidator.equals(
      "member has display name",
      typeof activity.member.displayName === "string",
      true,
    );
    TestValidator.equals(
      "activity has created at timestamp",
      activity.created_at !== undefined,
      true,
    );
  }
}
