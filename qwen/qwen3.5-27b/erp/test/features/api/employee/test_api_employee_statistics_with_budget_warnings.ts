import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeStatistic";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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
 * Test employee statistics endpoint with budget warnings functionality.
 * Verifies that the statistics endpoint returns properly structured data including budget_warnings array.
 */
export async function test_api_employee_statistics_with_budget_warnings(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Call statistics endpoint
  const statistics =
    await api.functional.hrmPlatform.admin.employees.statistics(
      adminConnection,
    );
  typia.assert(statistics);
  // 3. Validate response structure
  TestValidator.predicate(
    "total_employees is non-negative",
    statistics.total_employees >= 0,
  );
  TestValidator.predicate(
    "active_employees is non-negative",
    statistics.active_employees >= 0,
  );
  TestValidator.predicate(
    "deactivated_employees is non-negative",
    statistics.deactivated_employees >= 0,
  );
  // 4. Validate employment type breakdown
  TestValidator.predicate(
    "full_time count is non-negative",
    statistics.by_employment_type.full_time >= 0,
  );
  TestValidator.predicate(
    "part_time count is non-negative",
    statistics.by_employment_type.part_time >= 0,
  );
  TestValidator.predicate(
    "contractor count is non-negative",
    statistics.by_employment_type.contractor >= 0,
  );
  TestValidator.predicate(
    "intern count is non-negative",
    statistics.by_employment_type.intern >= 0,
  );
  // 5. Validate time tracking metrics
  TestValidator.predicate(
    "total_hours_this_week is non-negative",
    statistics.total_hours_this_week >= 0,
  );
  TestValidator.predicate(
    "average_hours_per_employee is non-negative",
    statistics.average_hours_per_employee >= 0,
  );
  // 6. Validate top performers array (max 5 items)
  TestValidator.predicate(
    "top_performers array exists",
    Array.isArray(statistics.top_performers),
  );
  TestValidator.predicate(
    "top_performers has at most 5 items",
    statistics.top_performers.length <= 5,
  );
  // 7. Validate timesheet counts
  TestValidator.predicate(
    "pending_timesheets is non-negative",
    statistics.pending_timesheets >= 0,
  );
  TestValidator.predicate(
    "approved_timesheets is non-negative",
    statistics.approved_timesheets >= 0,
  );
  TestValidator.predicate(
    "rejected_timesheets is non-negative",
    statistics.rejected_timesheets >= 0,
  );
  // 8. Validate budget_warnings array structure
  TestValidator.predicate(
    "budget_warnings array exists",
    Array.isArray(statistics.budget_warnings),
  );
  // Verify each project in budget_warnings has required ISummary fields
  await ArrayUtil.asyncForEach(statistics.budget_warnings, async (project) => {
    typia.assert<IHrmPlatformProject.ISummary>(project);
    TestValidator.predicate("project has valid id", project.id !== undefined);
    TestValidator.predicate(
      "project has valid name",
      project.name !== undefined,
    );
    TestValidator.predicate(
      "project has valid status",
      project.status !== undefined,
    );
    TestValidator.predicate(
      "project has valid color_code",
      project.color_code !== undefined,
    );
    TestValidator.predicate(
      "project has budget_hours defined (should not be null for warnings)",
      project.budget_hours !== null,
    );
    TestValidator.predicate(
      "project has valid created_at",
      project.created_at !== undefined,
    );
  });
  // 9. Validate generated_at timestamp
  TestValidator.predicate(
    "generated_at is valid date-time",
    statistics.generated_at !== undefined,
  );
  // 10. Verify employee count consistency
  TestValidator.equals(
    "total_employees equals active + deactivated",
    statistics.total_employees,
    statistics.active_employees + statistics.deactivated_employees,
  );
  // 11. Verify employment type sum equals total employees
  const employmentTypeSum =
    statistics.by_employment_type.full_time +
    statistics.by_employment_type.part_time +
    statistics.by_employment_type.contractor +
    statistics.by_employment_type.intern;
  TestValidator.equals(
    "employment type sum equals total_employees",
    employmentTypeSum,
    statistics.total_employees,
  );
}
