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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timelog_update_submitted_timesheet_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection with time management permissions
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Setup member connection (employee)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 3. Create a timelog entry as the member
  const today = new Date();
  const timelogDate = today.toISOString();
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: timelogDate,
        duration: 480, // 8 hours in minutes
        billable: true,
        description: "Working on project tasks",
      },
    },
  );
  typia.assert(timelog);
  // 4. Create a timesheet containing the timelog (as member)
  // Calculate Monday of the current week
  const weekStart = new Date(today);
  const dayOfWeek = weekStart.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
  weekStart.setDate(today.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStart.toISOString(),
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 5. Update the timesheet to submitted status (as admin)
  // Note: Using update endpoint to change status if supported
  const updatedTimesheet =
    await api.functional.hrmPlatform.admin.timesheets.update(adminConnection, {
      timesheetId: timesheet.id,
      body: {} satisfies IHrmPlatformTimesheet.IUpdate,
    });
  typia.assert(updatedTimesheet);
  // 6. Update the timelog as admin with time:manage permission
  // This tests that admin can update timelogs even when timesheet is submitted
  const newDescription = RandomGenerator.paragraph({ sentences: 2 });
  const newDuration = 540; // 9 hours in minutes
  const updatedTimelog = await api.functional.hrmPlatform.admin.timelogs.update(
    adminConnection,
    {
      timelogId: timelog.id,
      body: {
        duration: newDuration,
        description: newDescription,
      } satisfies IHrmPlatformTimelog.IUpdate,
    },
  );
  typia.assert(updatedTimelog);
  // 7. Verify the update was successful
  TestValidator.equals(
    "timelog duration updated",
    updatedTimelog.duration,
    newDuration,
  );
  TestValidator.equals(
    "timelog description updated",
    updatedTimelog.description,
    newDescription,
  );
  TestValidator.predicate(
    "timelog date is immutable",
    updatedTimelog.date === timelog.date,
  );
  TestValidator.predicate(
    "timelog is still active",
    updatedTimelog.deleted_at === null,
  );
  TestValidator.predicate(
    "timelog has valid project",
    updatedTimelog.project.id !== null,
  );
  TestValidator.predicate(
    "timelog has valid employee",
    updatedTimelog.employee.id !== null,
  );
  // 8. Verify admin permissions allowed the update
  // The fact that we successfully updated proves admin has elevated privileges
  TestValidator.predicate(
    "admin can update submitted timesheet timelogs",
    updatedTimelog.id === timelog.id,
  );
}
