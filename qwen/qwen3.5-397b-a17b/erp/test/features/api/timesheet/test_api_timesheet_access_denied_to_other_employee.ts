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
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test that an employee cannot access another employee's timesheet without approval permission.
 *
 * Validates the timesheet access control system by ensuring that employees can only access their own timesheets or timesheets they have permission to review. The test creates two separate member accounts with default employee roles (no time:approve permission), has Employee A create a timesheet, then attempts to retrieve that timesheet using Employee B's credentials.
 *
 * The access control rules being tested are:
 * 1. Employees can access their own timesheets regardless of status.
 * 2. Employees with time:approve permission can access submitted timesheets for review.
 * 3. Employees without time:approve permission cannot access other employees' timesheets.
 *
 * This ensures timesheet privacy and proper permission enforcement across the organization.
 *
 * 1. Employee A registers with unique email and password credentials.
 * 2. Employee A creates a timesheet for a specific week period (Monday start date).
 * 3. Employee B registers with different unique email and password credentials.
 * 4. Employee B attempts to retrieve Employee A's timesheet using the timesheet ID.
 * 5. Validates that the system rejects the request with 403 Forbidden error.
 */
export async function test_api_timesheet_access_denied_to_other_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Employee A setup - create account and timesheet
  const employeeAConnection: api.IConnection = { host: connection.host };
  const employeeA = await authorize_member_join(employeeAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeA);
  // 2. Employee A creates a timesheet
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeAConnection,
    {},
  );
  typia.assert(timesheet);
  // 3. Employee B setup - create separate account without approval permissions
  const employeeBConnection: api.IConnection = { host: connection.host };
  const employeeB = await authorize_member_join(employeeBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeB);
  // 4. Employee B attempts to access Employee A's timesheet (should fail with 403)
  await TestValidator.error(
    "employee B cannot access employee A's timesheet without permission",
    async () => {
      await api.functional.hrmPlatform.member.timesheets.at(
        employeeBConnection,
        {
          timesheetId: timesheet.id,
        },
      );
    },
  );
}
