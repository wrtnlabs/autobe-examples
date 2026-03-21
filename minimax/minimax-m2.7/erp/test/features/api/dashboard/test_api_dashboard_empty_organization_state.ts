import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_dashboard_empty_organization_state(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Step 2: Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        color: "#3B82F6",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // Step 3: Retrieve dashboard
  const dashboard =
    await api.functional.erpHrm.member.organizations.dashboard.at(
      memberConnection,
      {
        organizationId: project.organization.id,
      },
    );
  typia.assert(dashboard);
  // Validation 1: Response structure is valid (typia.assert covers this)
  // Validation 2: Projects should show status breakdown with 1 active
  TestValidator.equals(
    "project total count is 1",
    dashboard.projectOverview.total_count,
    1,
  );
  TestValidator.equals(
    "project status active is 1",
    dashboard.projectOverview.by_status.active,
    1,
  );
  TestValidator.equals(
    "project status archived is 0",
    dashboard.projectOverview.by_status.archived,
    0,
  );
  TestValidator.equals(
    "project status completed is 0",
    dashboard.projectOverview.by_status.completed,
    0,
  );
  // Validation 3: Zero hours logged in time tracking
  TestValidator.equals(
    "hours logged this week is 0",
    dashboard.timeTracking.hours_logged_this_week,
    0,
  );
  TestValidator.equals(
    "hours logged this month is 0",
    dashboard.timeTracking.hours_logged_this_month,
    0,
  );
  TestValidator.equals(
    "billable hours is 0",
    dashboard.timeTracking.billable_hours,
    0,
  );
  TestValidator.equals(
    "non-billable hours is 0",
    dashboard.timeTracking.non_billable_hours,
    0,
  );
  // Validation 4: Empty recent activity array
  TestValidator.equals(
    "recent activity is empty",
    dashboard.recentActivity.length,
    0,
  );
  // Validation 5: Task metrics showing zero totals
  TestValidator.equals(
    "task total count is 0",
    dashboard.taskMetrics.total_count,
    0,
  );
  TestValidator.equals(
    "task status open is 0",
    dashboard.taskMetrics.by_status.open,
    0,
  );
  TestValidator.equals(
    "task status in_progress is 0",
    dashboard.taskMetrics.by_status.in_progress,
    0,
  );
  TestValidator.equals(
    "task status completed is 0",
    dashboard.taskMetrics.by_status.completed,
    0,
  );
  TestValidator.equals(
    "task status closed is 0",
    dashboard.taskMetrics.by_status.closed,
    0,
  );
  TestValidator.equals(
    "task priority low is 0",
    dashboard.taskMetrics.by_priority.low,
    0,
  );
  TestValidator.equals(
    "task priority medium is 0",
    dashboard.taskMetrics.by_priority.medium,
    0,
  );
  TestValidator.equals(
    "task priority high is 0",
    dashboard.taskMetrics.by_priority.high,
    0,
  );
  TestValidator.equals(
    "task priority urgent is 0",
    dashboard.taskMetrics.by_priority.urgent,
    0,
  );
  // Validation 6: Employee statistics (owner is not counted as employee)
  TestValidator.equals(
    "employee total count is 0",
    dashboard.employeeStatistics.total_count,
    0,
  );
  TestValidator.equals(
    "employee by status active is 0",
    dashboard.employeeStatistics.by_status.active,
    0,
  );
  TestValidator.equals(
    "employee by status deactivated is 0",
    dashboard.employeeStatistics.by_status.deactivated,
    0,
  );
}
