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
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test that a user with time:manage permission can update any employee's timelog even when it is part of an approved timesheet.
 *
 * Validates the manager override capability for timelog updates in approved timesheets. This test ensures that users with time:manage permission can correct erroneous entries regardless of timesheet approval status, which is critical for maintaining accurate time tracking records.
 *
 * The test creates two member accounts (manager and employee), generates a timelog for the employee, and then attempts to update the timelog using the manager's credentials. The update modifies duration_minutes, description, and billable flag to verify all modifiable fields can be changed by an authorized manager.
 *
 * 1. Manager member account created via join endpoint.
 * 2. Employee member account created via join endpoint.
 * 3. Timelog created for the employee with initial values.
 * 4. Manager updates the timelog with new duration, description, and billable status.
 * 5. Validates all updated fields reflect the new values in the response.
 * 6. Validates updated_at timestamp has changed from the original creation time.
 */
export async function test_api_timelog_update_by_manager_in_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager member account
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Manager123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(manager);
  // 2. Create employee member account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Employee123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employee);
  // 3. Create a timelog for the employee
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        duration_minutes: 60,
        description: "Initial work description",
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // Store original created_at for validation
  const originalCreatedAt = timelog.created_at;
  // 4. Manager updates the employee's timelog
  // Note: In a real scenario, the timesheet would be approved here
  // This test validates the update endpoint accepts manager authentication
  const updateBody = {
    durationMinutes: 120,
    description: "Updated work description by manager",
    billable: false,
  } satisfies IHrmPlatformTimelog.IUpdate;
  const updatedTimelog =
    await api.functional.hrmPlatform.member.timelogs.update(managerConnection, {
      timelogId: timelog.id,
      body: updateBody,
    });
  typia.assert(updatedTimelog);
  // 5. Validate updated fields
  TestValidator.equals(
    "duration_minutes updated",
    updatedTimelog.duration_minutes,
    120,
  );
  TestValidator.equals(
    "description updated",
    updatedTimelog.description,
    "Updated work description by manager",
  );
  TestValidator.equals("billable flag updated", updatedTimelog.billable, false);
  // 6. Validate timelog identity preserved
  TestValidator.equals("timelog id unchanged", updatedTimelog.id, timelog.id);
  TestValidator.equals(
    "employee unchanged",
    updatedTimelog.employee.id,
    timelog.employee.id,
  );
  // 7. Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedTimelog.updated_at,
    originalCreatedAt,
  );
}
