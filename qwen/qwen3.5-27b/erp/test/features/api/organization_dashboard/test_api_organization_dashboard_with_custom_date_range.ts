import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboard";
import type { IHrmPlatformOrganizationDashboardBudgetWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboardBudgetWarning";
import type { IHrmPlatformOrganizationDashboardEmployeeByDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboardEmployeeByDepartment";
import type { IHrmPlatformOrganizationDashboardTopPerformer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboardTopPerformer";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_organization_dashboard_with_custom_date_range(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that an authenticated admin can view the organization dashboard filtered by a custom date range.
   *
   * This test validates:
   * 1. Admin authentication and authorization
   * 2. Custom date range filtering for time-based metrics
   * 3. Current state metrics (employee counts, project status) are not date-filtered
   * 4. Response structure and data integrity
   */
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Calculate custom date range (previous month)
  const now = new Date();
  const firstDayOfPreviousMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  );
  const lastDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startDate = firstDayOfPreviousMonth.toISOString();
  const endDate = lastDayOfPreviousMonth.toISOString();
  // 3. Request dashboard with custom date range
  const dashboard =
    await api.functional.hrmPlatform.admin.organization_dashboard.overview(
      adminConnection,
      {
        body: {
          startDate,
          endDate,
        } satisfies IHrmPlatformOrganizationDashboard.IRequest,
      },
    );
  // 4. Validate response structure
  typia.assert(dashboard);
  // 5. Validate employee metrics (NOT date-filtered, represent current state)
  TestValidator.predicate(
    "totalEmployees is non-negative",
    dashboard.totalEmployees >= 0,
  );
  TestValidator.equals(
    "employeesByType sum equals totalEmployees",
    dashboard.employeesByType.fullTime +
      dashboard.employeesByType.partTime +
      dashboard.employeesByType.contractor +
      dashboard.employeesByType.intern,
    dashboard.totalEmployees,
  );
  TestValidator.predicate(
    "employeesByDepartment array exists",
    Array.isArray(dashboard.employeesByDepartment),
  );
  // 6. Validate time tracking metrics (ARE date-filtered)
  TestValidator.predicate(
    "totalHoursLogged is non-negative",
    dashboard.totalHoursLogged >= 0,
  );
  TestValidator.predicate(
    "averageHoursPerEmployee is non-negative",
    dashboard.averageHoursPerEmployee >= 0,
  );
  // Validate average calculation
  if (dashboard.totalEmployees > 0) {
    const expectedAverage =
      dashboard.totalHoursLogged / dashboard.totalEmployees;
    TestValidator.equals(
      "averageHoursPerEmployee matches calculation",
      dashboard.averageHoursPerEmployee,
      expectedAverage,
    );
  } else {
    TestValidator.equals(
      "averageHoursPerEmployee is 0 when no employees",
      dashboard.averageHoursPerEmployee,
      0,
    );
  }
  TestValidator.predicate(
    "activeTimers is non-negative",
    dashboard.activeTimers >= 0,
  );
  // 7. Validate timesheet metrics (NOT date-filtered, current state)
  TestValidator.predicate(
    "timesheetsByStatus exists with all status types",
    dashboard.timesheetsByStatus.draft >= 0 &&
      dashboard.timesheetsByStatus.submitted >= 0 &&
      dashboard.timesheetsByStatus.approved >= 0 &&
      dashboard.timesheetsByStatus.rejected >= 0,
  );
  TestValidator.equals(
    "pendingApprovals equals timesheetsByStatus.submitted",
    dashboard.pendingApprovals,
    dashboard.timesheetsByStatus.submitted,
  );
  // 8. Validate project metrics (NOT date-filtered, current state)
  TestValidator.predicate(
    "projectsByStatus exists with all status types",
    dashboard.projectsByStatus.active >= 0 &&
      dashboard.projectsByStatus.completed >= 0 &&
      dashboard.projectsByStatus.archived >= 0,
  );
  // 9. Validate budget warnings (NOT date-filtered, but based on all-time timelogs)
  TestValidator.predicate(
    "budgetWarnings is an array",
    Array.isArray(dashboard.budgetWarnings),
  );
  for (const warning of dashboard.budgetWarnings) {
    TestValidator.predicate(
      `budget warning for project ${warning.projectName} has valid data`,
      warning.budgetHours > 0 &&
        warning.actualHours > 0 &&
        warning.overagePercentage > 0 &&
        warning.actualHours > warning.budgetHours,
    );
    // Validate overage percentage calculation
    const expectedOverage =
      ((warning.actualHours - warning.budgetHours) / warning.budgetHours) * 100;
    TestValidator.equals(
      `overage percentage for ${warning.projectName}`,
      warning.overagePercentage,
      Math.round(expectedOverage * 100) / 100,
    );
  }
  // 10. Validate top performers (ARE date-filtered by the custom date range)
  TestValidator.predicate(
    "topPerformers is an array",
    Array.isArray(dashboard.topPerformers),
  );
  TestValidator.predicate(
    "topPerformers has at most 5 entries",
    dashboard.topPerformers.length <= 5,
  );
  for (const performer of dashboard.topPerformers) {
    TestValidator.predicate(
      `top performer ${performer.employee.member.email} has valid data`,
      performer.totalHoursLogged >= 0,
    );
    TestValidator.predicate(
      `top performer ${performer.employee.member.email} has employee summary`,
      performer.employee.id !== undefined &&
        performer.employee.employment_type !== undefined &&
        performer.employee.status !== undefined &&
        performer.employee.member.email !== undefined,
    );
  }
  // Validate top performers are sorted by totalHoursLogged in descending order
  for (let i = 0; i < dashboard.topPerformers.length - 1; i++) {
    TestValidator.predicate(
      `top performers are sorted in descending order (position ${i})`,
      dashboard.topPerformers[i].totalHoursLogged >=
        dashboard.topPerformers[i + 1].totalHoursLogged,
    );
  }
}
