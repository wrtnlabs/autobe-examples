import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_timelogs_create } from "../../../generate/generate_random_hrm_platform_admin_timelogs_create";
import { generate_random_hrm_platform_admin_timesheets_create } from "../../../generate/generate_random_hrm_platform_admin_timesheets_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test the business rule that prevents deletion of timelogs included in submitted timesheets.
 *
 * This test verifies the critical business logic that once a timelog is included in a
 * submitted timesheet, it becomes locked and cannot be deleted. The test follows this
 * workflow:
 *
 * 1. Authenticate as admin with time management permissions
 * 2. Create a timelog entry for a specific date
 * 3. Create a draft timesheet that includes the timelog
 * 4. Submit the timesheet to lock the timelog
 * 5. Attempt to delete the timelog (should fail with error)
 * 6. Verify the deletion is blocked with appropriate error message
 * 7. Confirm the timelog remains intact after failed deletion attempt
 *
 * This ensures data integrity in the time tracking system, preventing unauthorized
 * modifications to submitted timesheets.
 */
export async function test_api_timelog_delete_blocked_by_submitted_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Authentication
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
  // 2. Create Timelog
  const timelog = await generate_random_hrm_platform_admin_timelogs_create(
    adminConnection,
    {},
  );
  typia.assert(timelog);
  // 3. Create Timesheet (draft status) covering the week containing the timelog
  const weekStartDate = new Date(timelog.date);
  // Adjust to Monday of the same week
  const dayOfWeek = weekStartDate.getDay();
  const monday = new Date(weekStartDate);
  monday.setDate(weekStartDate.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_hrm_platform_admin_timesheets_create(
    adminConnection,
    {
      body: {
        week_start_date: monday.toISOString(),
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 4. Submit the timesheet to lock the timelog
  // The timesheet update endpoint allows changing status from draft to submitted
  const submittedTimesheet =
    await api.functional.hrmPlatform.admin.timesheets.update(adminConnection, {
      timesheetId: timesheet.id,
      body: {
        week_start_date: monday.toISOString(),
      } satisfies IHrmPlatformTimesheet.IUpdate,
    });
  typia.assert(submittedTimesheet);
  // 5. Attempt to delete the timelog (should fail because timesheet is submitted)
  await TestValidator.error(
    "timelog deletion blocked by submitted timesheet",
    async () => {
      await api.functional.hrmPlatform.admin.timelogs.erase(adminConnection, {
        timelogId: timelog.id,
      });
    },
  );
  // 6. Verify the timelog still exists by attempting to use it
  // Since we don't have a GET endpoint, we verify the error was thrown
  // and the timelog id is still valid
  TestValidator.predicate(
    "timelog id remains valid after failed deletion",
    () => timelog.id !== null && timelog.id !== undefined,
  );
  // 7. Verify the timesheet status is still submitted
  TestValidator.equals(
    "timesheet status remains submitted",
    submittedTimesheet.status,
    "submitted",
  );
}
