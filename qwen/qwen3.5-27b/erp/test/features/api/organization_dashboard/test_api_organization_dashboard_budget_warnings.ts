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
 * Test that the organization dashboard correctly identifies and displays projects
 * exceeding their allocated budget hours. Validates the budgetWarnings array
 * contains only projects where actual logged hours exceed budget hours, with
 * accurate overage percentage calculations.
 */
export async function test_api_organization_dashboard_budget_warnings(
  connection: api.IConnection,
): Promise<void> {
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
  // 2. Call organization dashboard endpoint
  const dashboard =
    await api.functional.hrmPlatform.admin.organization_dashboard.overview(
      adminConnection,
      {
        body: {} satisfies IHrmPlatformOrganizationDashboard.IRequest,
      },
    );
  typia.assert(dashboard);
  // 3. Validate each budget warning entry - business logic validation
  await ArrayUtil.asyncForEach(dashboard.budgetWarnings, async (warning) => {
    // Validate actualHours exceeds budgetHours (business rule)
    TestValidator.predicate(
      `project ${warning.projectName} actual hours exceed budget: ${warning.actualHours} > ${warning.budgetHours}`,
      warning.actualHours > warning.budgetHours,
    );
    // Validate overagePercentage calculation accuracy
    const expectedOverage =
      ((warning.actualHours - warning.budgetHours) / warning.budgetHours) * 100;
    TestValidator.equals(
      `overagePercentage calculated correctly for ${warning.projectName}`,
      Math.round(warning.overagePercentage * 100) / 100,
      Math.round(expectedOverage * 100) / 100,
    );
    // Validate overagePercentage is positive
    TestValidator.predicate(
      `overagePercentage is positive for ${warning.projectName}: ${warning.overagePercentage}`,
      warning.overagePercentage > 0,
    );
    // Validate budgetHours is positive
    TestValidator.predicate(
      `budgetHours is positive for ${warning.projectName}: ${warning.budgetHours}`,
      warning.budgetHours > 0,
    );
  });
  // 4. Validate dashboard metrics are non-negative (business logic)
  TestValidator.predicate(
    "totalEmployees is non-negative",
    dashboard.totalEmployees >= 0,
  );
  TestValidator.predicate(
    "totalHoursLogged is non-negative",
    dashboard.totalHoursLogged >= 0,
  );
  TestValidator.predicate(
    "activeTimers is non-negative",
    dashboard.activeTimers >= 0,
  );
  // 5. Validate averageHoursPerEmployee calculation
  if (dashboard.totalEmployees > 0) {
    const expectedAverage =
      dashboard.totalHoursLogged / dashboard.totalEmployees;
    TestValidator.equals(
      "averageHoursPerEmployee calculated correctly",
      Math.round(dashboard.averageHoursPerEmployee * 100) / 100,
      Math.round(expectedAverage * 100) / 100,
    );
  } else {
    TestValidator.equals(
      "averageHoursPerEmployee is 0 when no employees",
      dashboard.averageHoursPerEmployee,
      0,
    );
  }
  // 6. Validate topPerformers array has at most 5 items
  TestValidator.predicate(
    "topPerformers has at most 5 items",
    dashboard.topPerformers.length <= 5,
  );
  // 7. Validate each top performer has positive hours
  await ArrayUtil.asyncForEach(dashboard.topPerformers, async (performer) => {
    TestValidator.predicate(
      `top performer ${performer.employee.member.email} has non-negative hours: ${performer.totalHoursLogged}`,
      performer.totalHoursLogged >= 0,
    );
  });
  // 8. Validate employeesByDepartment entries have positive counts
  await ArrayUtil.asyncForEach(
    dashboard.employeesByDepartment,
    async (dept) => {
      TestValidator.predicate(
        `department ${dept.departmentName} has non-negative employee count: ${dept.employeeCount}`,
        dept.employeeCount >= 0,
      );
    },
  );
  // 9. Validate timesheetsByStatus counts are non-negative
  TestValidator.predicate(
    "timesheetsByStatus.draft is non-negative",
    dashboard.timesheetsByStatus.draft >= 0,
  );
  TestValidator.predicate(
    "timesheetsByStatus.submitted is non-negative",
    dashboard.timesheetsByStatus.submitted >= 0,
  );
  TestValidator.predicate(
    "timesheetsByStatus.approved is non-negative",
    dashboard.timesheetsByStatus.approved >= 0,
  );
  TestValidator.predicate(
    "timesheetsByStatus.rejected is non-negative",
    dashboard.timesheetsByStatus.rejected >= 0,
  );
  // 10. Validate pendingApprovals matches submitted count
  TestValidator.equals(
    "pendingApprovals equals timesheetsByStatus.submitted",
    dashboard.pendingApprovals,
    dashboard.timesheetsByStatus.submitted,
  );
  // 11. Validate projectsByStatus counts are non-negative
  TestValidator.predicate(
    "projectsByStatus.active is non-negative",
    dashboard.projectsByStatus.active >= 0,
  );
  TestValidator.predicate(
    "projectsByStatus.completed is non-negative",
    dashboard.projectsByStatus.completed >= 0,
  );
  TestValidator.predicate(
    "projectsByStatus.archived is non-negative",
    dashboard.projectsByStatus.archived >= 0,
  );
  // 12. Validate employeesByType counts are non-negative
  TestValidator.predicate(
    "employeesByType.fullTime is non-negative",
    dashboard.employeesByType.fullTime >= 0,
  );
  TestValidator.predicate(
    "employeesByType.partTime is non-negative",
    dashboard.employeesByType.partTime >= 0,
  );
  TestValidator.predicate(
    "employeesByType.contractor is non-negative",
    dashboard.employeesByType.contractor >= 0,
  );
  TestValidator.predicate(
    "employeesByType.intern is non-negative",
    dashboard.employeesByType.intern >= 0,
  );
  // 13. Validate total employees equals sum of employees by type
  const totalByType =
    dashboard.employeesByType.fullTime +
    dashboard.employeesByType.partTime +
    dashboard.employeesByType.contractor +
    dashboard.employeesByType.intern;
  TestValidator.equals(
    "totalEmployees equals sum of employeesByType",
    dashboard.totalEmployees,
    totalByType,
  );
}
