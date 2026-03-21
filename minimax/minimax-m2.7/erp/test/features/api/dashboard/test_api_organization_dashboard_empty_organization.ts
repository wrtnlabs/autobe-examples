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

export async function test_api_organization_dashboard_empty_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve the dashboard with a test organization ID
  // Note: Since no organization creation endpoint is available in SDK,
  // using a random UUID to test dashboard endpoint behavior
  const dashboard =
    await api.functional.erpHrm.admin.organizations.dashboard.at(
      adminConnection,
      {
        organizationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(dashboard);
  // 3. Validate organization summary with empty data
  TestValidator.equals(
    "employee_count should be 0",
    dashboard.organization.employee_count,
    0,
  );
  // 4. Validate employee statistics with zeros
  TestValidator.equals(
    "employee total_count should be 0",
    dashboard.employeeStatistics.total_count,
    0,
  );
  TestValidator.equals(
    "employee by_status.active should be 0",
    dashboard.employeeStatistics.by_status.active,
    0,
  );
  TestValidator.equals(
    "employee by_status.deactivated should be 0",
    dashboard.employeeStatistics.by_status.deactivated,
    0,
  );
  TestValidator.equals(
    "employee by_employment_type.full_time should be 0",
    dashboard.employeeStatistics.by_employment_type.full_time,
    0,
  );
  TestValidator.equals(
    "employee by_employment_type.part_time should be 0",
    dashboard.employeeStatistics.by_employment_type.part_time,
    0,
  );
  TestValidator.equals(
    "employee by_employment_type.contractor should be 0",
    dashboard.employeeStatistics.by_employment_type.contractor,
    0,
  );
  TestValidator.equals(
    "employee by_employment_type.intern should be 0",
    dashboard.employeeStatistics.by_employment_type.intern,
    0,
  );
  // 5. Validate project overview with zeros
  TestValidator.equals(
    "project total_count should be 0",
    dashboard.projectOverview.total_count,
    0,
  );
  TestValidator.equals(
    "project by_status.active should be 0",
    dashboard.projectOverview.by_status.active,
    0,
  );
  TestValidator.equals(
    "project by_status.archived should be 0",
    dashboard.projectOverview.by_status.archived,
    0,
  );
  TestValidator.equals(
    "project by_status.completed should be 0",
    dashboard.projectOverview.by_status.completed,
    0,
  );
  // 6. Validate task metrics with zeros
  TestValidator.equals(
    "task total_count should be 0",
    dashboard.taskMetrics.total_count,
    0,
  );
  TestValidator.equals(
    "task by_status.open should be 0",
    dashboard.taskMetrics.by_status.open,
    0,
  );
  TestValidator.equals(
    "task by_status.in_progress should be 0",
    dashboard.taskMetrics.by_status.in_progress,
    0,
  );
  TestValidator.equals(
    "task by_status.completed should be 0",
    dashboard.taskMetrics.by_status.completed,
    0,
  );
  TestValidator.equals(
    "task by_status.closed should be 0",
    dashboard.taskMetrics.by_status.closed,
    0,
  );
  TestValidator.equals(
    "task by_priority.low should be 0",
    dashboard.taskMetrics.by_priority.low,
    0,
  );
  TestValidator.equals(
    "task by_priority.medium should be 0",
    dashboard.taskMetrics.by_priority.medium,
    0,
  );
  TestValidator.equals(
    "task by_priority.high should be 0",
    dashboard.taskMetrics.by_priority.high,
    0,
  );
  TestValidator.equals(
    "task by_priority.urgent should be 0",
    dashboard.taskMetrics.by_priority.urgent,
    0,
  );
  TestValidator.equals(
    "task completion_rate should be 0",
    dashboard.taskMetrics.completion_rate,
    0,
  );
  // 7. Validate time tracking with zeros
  TestValidator.equals(
    "time hours_logged_this_week should be 0",
    dashboard.timeTracking.hours_logged_this_week,
    0,
  );
  TestValidator.equals(
    "time hours_logged_this_month should be 0",
    dashboard.timeTracking.hours_logged_this_month,
    0,
  );
  TestValidator.equals(
    "time billable_hours should be 0",
    dashboard.timeTracking.billable_hours,
    0,
  );
  TestValidator.equals(
    "time non_billable_hours should be 0",
    dashboard.timeTracking.non_billable_hours,
    0,
  );
  TestValidator.equals(
    "time average_daily_hours should be 0",
    dashboard.timeTracking.average_daily_hours,
    0,
  );
  // 8. Validate recent activity is empty array
  TestValidator.equals(
    "recentActivity should be empty array",
    dashboard.recentActivity,
    [],
  );
}
