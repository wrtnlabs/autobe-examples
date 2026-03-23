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
 * Test edge case where organization has no employees, timelogs, or timesheets.
 *
 * This test verifies that the employee statistics endpoint correctly handles
 * an empty organization state where there are zero employees, no timelogs,
 * no timesheets, and no projects. All statistics should return zero values
 * or empty arrays without errors.
 */
export async function test_api_employee_statistics_empty_organization(
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
    },
  });
  // 2. Call statistics endpoint (organization has no employees by default)
  const statistics =
    await api.functional.hrmPlatform.admin.employees.statistics(
      adminConnection,
    );
  typia.assert(statistics);
  // 3. Validate total employee counts are zero
  TestValidator.equals("total_employees is 0", statistics.total_employees, 0);
  TestValidator.equals("active_employees is 0", statistics.active_employees, 0);
  TestValidator.equals(
    "deactivated_employees is 0",
    statistics.deactivated_employees,
    0,
  );
  // 4. Validate employment type breakdown - all categories should be zero
  TestValidator.equals(
    "full_time employment count is 0",
    statistics.by_employment_type.full_time,
    0,
  );
  TestValidator.equals(
    "part_time employment count is 0",
    statistics.by_employment_type.part_time,
    0,
  );
  TestValidator.equals(
    "contractor employment count is 0",
    statistics.by_employment_type.contractor,
    0,
  );
  TestValidator.equals(
    "intern employment count is 0",
    statistics.by_employment_type.intern,
    0,
  );
  // 5. Validate time tracking metrics are zero
  TestValidator.equals(
    "total_hours_this_week is 0",
    statistics.total_hours_this_week,
    0,
  );
  TestValidator.equals(
    "average_hours_per_employee is 0",
    statistics.average_hours_per_employee,
    0,
  );
  // 6. Validate top performers is empty array
  TestValidator.equals(
    "top_performers is empty array",
    statistics.top_performers.length,
    0,
  );
  // 7. Validate timesheet statistics are zero
  TestValidator.equals(
    "pending_timesheets is 0",
    statistics.pending_timesheets,
    0,
  );
  TestValidator.equals(
    "approved_timesheets is 0",
    statistics.approved_timesheets,
    0,
  );
  TestValidator.equals(
    "rejected_timesheets is 0",
    statistics.rejected_timesheets,
    0,
  );
  // 8. Validate budget warnings is empty array
  TestValidator.equals(
    "budget_warnings is empty array",
    statistics.budget_warnings.length,
    0,
  );
  // 9. Validate generated_at timestamp is present
  TestValidator.predicate("generated_at is valid date-time", () => {
    const date = new Date(statistics.generated_at);
    return !isNaN(date.getTime());
  });
}
