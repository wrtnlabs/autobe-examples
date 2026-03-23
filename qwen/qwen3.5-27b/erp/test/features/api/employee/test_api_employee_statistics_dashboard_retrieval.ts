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
 * Test retrieval of comprehensive employee statistics for the organization dashboard.
 * Validates that the statistics endpoint correctly aggregates employee counts,
 * time tracking metrics, timesheet workflow status, and budget utilization warnings.
 */
export async function test_api_employee_statistics_dashboard_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Retrieve employee statistics
  const statistics =
    await api.functional.hrmPlatform.admin.employees.statistics(
      adminConnection,
    );
  typia.assert(statistics);
  // 3. Validate total employees calculation
  TestValidator.equals(
    "total employees equals active plus deactivated",
    statistics.total_employees,
    statistics.active_employees + statistics.deactivated_employees,
  );
  // 4. Validate employment type breakdown sums to total
  const employmentTypeSum =
    statistics.by_employment_type.full_time +
    statistics.by_employment_type.part_time +
    statistics.by_employment_type.contractor +
    statistics.by_employment_type.intern;
  TestValidator.equals(
    "employment type counts sum to total employees",
    employmentTypeSum,
    statistics.total_employees,
  );
  // 5. Validate time tracking metrics are non-negative
  TestValidator.predicate(
    "total hours this week is non-negative",
    statistics.total_hours_this_week >= 0,
  );
  TestValidator.predicate(
    "average hours per employee is non-negative",
    statistics.average_hours_per_employee >= 0,
  );
  // 6. Validate top performers array constraints
  TestValidator.predicate(
    "top performers array has at most 5 items",
    statistics.top_performers.length <= 5,
  );
  TestValidator.predicate(
    "top performers array has non-negative length",
    statistics.top_performers.length >= 0,
  );
  // 7. Validate timesheet workflow counts are non-negative
  TestValidator.predicate(
    "pending timesheets count is non-negative",
    statistics.pending_timesheets >= 0,
  );
  TestValidator.predicate(
    "approved timesheets count is non-negative",
    statistics.approved_timesheets >= 0,
  );
  TestValidator.predicate(
    "rejected timesheets count is non-negative",
    statistics.rejected_timesheets >= 0,
  );
  // 8. Validate budget warnings is an array
  TestValidator.predicate(
    "budget warnings is an array",
    Array.isArray(statistics.budget_warnings),
  );
  // 9. Validate generated_at timestamp is recent (within last 10 minutes)
  const generatedAt = new Date(statistics.generated_at);
  const now = new Date();
  const timeDiff = now.getTime() - generatedAt.getTime();
  const tenMinutes = 10 * 60 * 1000;
  TestValidator.predicate(
    "generated_at timestamp is within last 10 minutes",
    timeDiff >= 0 && timeDiff <= tenMinutes,
  );
}
