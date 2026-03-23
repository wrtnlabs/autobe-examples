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

/**
 * Test that an authenticated admin can view the organization dashboard with default date range (current calendar month).
 *
 * This test validates:
 * 1. Admin authentication flow
 * 2. Dashboard API call with default date range (empty body)
 * 3. Response structure validation
 * 4. Business logic consistency of dashboard metrics
 */
export async function test_api_organization_dashboard_view_with_default_period(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call dashboard API with empty body (uses default current month range)
  const dashboard =
    await api.functional.hrmPlatform.admin.organization_dashboard.overview(
      adminConnection,
      {
        body: {} satisfies IHrmPlatformOrganizationDashboard.IRequest,
      },
    );
  typia.assert(dashboard);
  // 3. Validate totalEmployees is non-negative
  TestValidator.predicate(
    "totalEmployees is non-negative",
    dashboard.totalEmployees >= 0,
  );
  // 4. Validate employeesByType has all four employment types
  TestValidator.predicate(
    "employeesByType.fullTime exists",
    dashboard.employeesByType.fullTime >= 0,
  );
  TestValidator.predicate(
    "employeesByType.partTime exists",
    dashboard.employeesByType.partTime >= 0,
  );
  TestValidator.predicate(
    "employeesByType.contractor exists",
    dashboard.employeesByType.contractor >= 0,
  );
  TestValidator.predicate(
    "employeesByType.intern exists",
    dashboard.employeesByType.intern >= 0,
  );
  // 5. Validate sum of employeesByType equals totalEmployees
  const totalByType =
    dashboard.employeesByType.fullTime +
    dashboard.employeesByType.partTime +
    dashboard.employeesByType.contractor +
    dashboard.employeesByType.intern;
  TestValidator.equals(
    "sum of employeesByType equals totalEmployees",
    totalByType,
    dashboard.totalEmployees,
  );
  // 6. Validate employeesByDepartment is an array
  TestValidator.predicate(
    "employeesByDepartment is an array",
    Array.isArray(dashboard.employeesByDepartment),
  );
  // 7. Validate totalHoursLogged is non-negative
  TestValidator.predicate(
    "totalHoursLogged is non-negative",
    dashboard.totalHoursLogged >= 0,
  );
  // 8. Validate averageHoursPerEmployee is non-negative
  TestValidator.predicate(
    "averageHoursPerEmployee is non-negative",
    dashboard.averageHoursPerEmployee >= 0,
  );
  // 9. Validate averageHoursPerEmployee calculation
  const expectedAverage =
    dashboard.totalEmployees > 0
      ? dashboard.totalHoursLogged / dashboard.totalEmployees
      : 0;
  TestValidator.equals(
    "averageHoursPerEmployee equals totalHoursLogged / totalEmployees",
    dashboard.averageHoursPerEmployee,
    expectedAverage,
  );
  // 10. Validate activeTimers is non-negative
  TestValidator.predicate(
    "activeTimers is non-negative",
    dashboard.activeTimers >= 0,
  );
  // 11. Validate timesheetsByStatus has all four statuses
  TestValidator.predicate(
    "timesheetsByStatus.draft exists",
    dashboard.timesheetsByStatus.draft >= 0,
  );
  TestValidator.predicate(
    "timesheetsByStatus.submitted exists",
    dashboard.timesheetsByStatus.submitted >= 0,
  );
  TestValidator.predicate(
    "timesheetsByStatus.approved exists",
    dashboard.timesheetsByStatus.approved >= 0,
  );
  TestValidator.predicate(
    "timesheetsByStatus.rejected exists",
    dashboard.timesheetsByStatus.rejected >= 0,
  );
  // 12. Validate pendingApprovals equals timesheetsByStatus.submitted
  TestValidator.equals(
    "pendingApprovals equals timesheetsByStatus.submitted",
    dashboard.pendingApprovals,
    dashboard.timesheetsByStatus.submitted,
  );
  // 13. Validate projectsByStatus has all three statuses
  TestValidator.predicate(
    "projectsByStatus.active exists",
    dashboard.projectsByStatus.active >= 0,
  );
  TestValidator.predicate(
    "projectsByStatus.completed exists",
    dashboard.projectsByStatus.completed >= 0,
  );
  TestValidator.predicate(
    "projectsByStatus.archived exists",
    dashboard.projectsByStatus.archived >= 0,
  );
  // 14. Validate budgetWarnings is an array
  TestValidator.predicate(
    "budgetWarnings is an array",
    Array.isArray(dashboard.budgetWarnings),
  );
  // 15. Validate topPerformers is an array with max 5 items
  TestValidator.predicate(
    "topPerformers is an array",
    Array.isArray(dashboard.topPerformers),
  );
  TestValidator.predicate(
    "topPerformers has max 5 items",
    dashboard.topPerformers.length <= 5,
  );
  // 16. Validate each top performer has employee and totalHoursLogged
  await ArrayUtil.asyncForEach(dashboard.topPerformers, (performer) => {
    TestValidator.predicate(
      "top performer has employee",
      performer.employee !== undefined && performer.employee !== null,
    );
    TestValidator.predicate(
      "top performer has totalHoursLogged",
      performer.totalHoursLogged >= 0,
    );
    return Promise.resolve();
  });
}
