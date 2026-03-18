import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test business rule that timesheets cannot be submitted when empty (no timelogs).
 *
 * This test validates the following workflow:
 * 1. Authenticate as a member by joining the platform
 * 2. Create an employee record to establish organizational membership
 * 3. Create a draft timesheet for a specific week
 * 4. Verify the timesheet is created in draft status with no timelogs
 *
 * Note: The submission endpoint is not available in the current API functions,
 * so this test validates the initial timesheet creation state. The business rule
 * preventing empty timesheet submission would be enforced at the submission endpoint.
 */
export async function test_api_timesheet_empty_submission_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create employee record
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  TestValidator.equals("employee status", employee.status, "active");
  // 3. Create draft timesheet for current week
  const weekStartDate = new Date();
  // Set to Monday of current week
  const day = weekStartDate.getDay();
  const diff = weekStartDate.getDate() - day + (day === 0 ? -6 : 1);
  weekStartDate.setDate(diff);
  weekStartDate.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 4. Validate timesheet is in draft status with no timelogs
  TestValidator.equals("timesheet status", timesheet.status, "draft");
  TestValidator.equals(
    "timesheet has no timelogs",
    timesheet.timelogs.length,
    0,
  );
  TestValidator.equals(
    "timesheet employee",
    timesheet.employee.id,
    employee.id,
  );
}
