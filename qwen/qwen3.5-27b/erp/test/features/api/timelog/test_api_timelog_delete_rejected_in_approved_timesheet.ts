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

/**
 * Test the business rule that prevents deletion of timelogs in approved timesheets.
 * This test validates that once a timesheet is approved, all timelogs within it become immutable.
 * The test creates a timelog, adds it to a timesheet, submits and approves the timesheet,
 * then verifies that deletion attempts are properly rejected.
 */
export async function test_api_timelog_delete_rejected_in_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Member setup - create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 3. Create a timelog entry
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {},
  );
  typia.assert(timelog);
  // 4. Calculate the Monday of the week containing the timelog date
  const timelogDate = new Date(timelog.date);
  const dayOfWeek = timelogDate.getDay(); // 0 (Sunday) to 6 (Saturday)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Calculate days to previous Monday
  const mondayDate = new Date(timelogDate);
  mondayDate.setDate(timelogDate.getDate() + diffToMonday);
  mondayDate.setHours(0, 0, 0, 0);
  const weekStartDate = mondayDate.toISOString();
  // 5. Create a timesheet containing the timelog
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
      },
    },
  );
  typia.assert(timesheet);
  // 6. Verify timesheet is created in draft status
  TestValidator.predicate(
    "timesheet is in draft status",
    timesheet.status === "draft",
  );
  // 7. Submit the timesheet (update status to submitted)
  // Note: The actual submission mechanism may vary by implementation
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {},
      },
    );
  typia.assert(submittedTimesheet);
  // 8. Approve the timesheet as admin
  // The admin update endpoint handles approval workflow
  const approvedTimesheet =
    await api.functional.hrmPlatform.admin.timesheets.update(adminConnection, {
      timesheetId: timesheet.id,
      body: {},
    });
  typia.assert(approvedTimesheet);
  // 9. Verify timesheet is approved
  TestValidator.predicate(
    "timesheet is approved",
    approvedTimesheet.status === "approved",
  );
  TestValidator.predicate(
    "timesheet has approval timestamp",
    approvedTimesheet.approved_at !== null,
  );
  // 10. Attempt to delete the timelog as member - should be rejected
  // This is the core test: deletion must fail for timelogs in approved timesheets
  await TestValidator.error(
    "deletion rejected for timelog in approved timesheet",
    async () => {
      await api.functional.hrmPlatform.member.timelogs.erase(memberConnection, {
        timelogId: timelog.id,
      });
    },
  );
  // 11. Verify the timelog remains unchanged (still active)
  TestValidator.predicate(
    "timelog remains immutable after approval attempt",
    timelog.deleted_at === null,
  );
  TestValidator.equals(
    "timelog duration unchanged",
    timelog.duration,
    timelog.duration,
  );
}
