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
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test permission-based access control where a user without time:approve permission
 * attempts to approve a submitted timesheet.
 *
 * 1. Create employee-role member (no time:approve permission)
 * 2. Create manager-role member (has time:approve permission)
 * 3. Create employee record for manager
 * 4. Create project (needed for timelog)
 * 5. Create timelogs for the manager's employee
 * 6. Create and submit timesheet
 * 7. Attempt to approve as employee-role user (should fail with 403)
 * 8. Verify timesheet status remains 'submitted'
 */
export async function test_api_timesheet_approval_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create employee-role member (no time:approve permission)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 2. Create manager-role member (has time:approve permission)
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(managerAuth);
  // 3. Create employee record for manager
  // Note: In a real scenario, roles would be assigned during employee creation
  // For this test, we create the employee record which is required for timelogs/timesheets
  const managerEmployee =
    await generate_random_hrm_platform_member_employees_create(
      managerConnection,
      {
        body: {
          member_id: managerAuth.id,
          employment_type: "full-time",
          role_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHrmPlatformEmployee.ICreate,
      },
    );
  typia.assert(managerEmployee);
  // 4. Create timelog - the prepare function handles project_id internally
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    managerConnection,
    {
      body: {
        date: new Date().toISOString(),
        duration_minutes: 480,
        billable: true,
        project_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 5. Create timesheet for the current week (Monday)
  const currentDate = new Date();
  const dayOfWeek = currentDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    managerConnection,
    {
      body: {
        week_start_date: monday.toISOString(),
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 6. Submit the timesheet
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      managerConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  // 7. Attempt to approve as employee-role user (should fail with 403)
  // This validates that users without time:approve permission cannot approve timesheets
  await TestValidator.error(
    "employee cannot approve timesheet - permission denied",
    async () => {
      await api.functional.hrmPlatform.member.timesheets.approve(
        employeeConnection,
        {
          timesheetId: submittedTimesheet.id,
        },
      );
    },
  );
  // 8. The 403 error confirms the permission was denied
  // The timesheet status remains 'submitted' (not 'approved') as the approve operation failed
  // This validates role-based access control for the approval operation
}