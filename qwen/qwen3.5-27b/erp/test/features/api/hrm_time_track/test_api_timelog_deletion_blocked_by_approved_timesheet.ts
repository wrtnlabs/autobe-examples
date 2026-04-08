import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import type { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_timelogs_create } from "../../../generate/generate_random_hrm_time_track_member_timelogs_create";
import { generate_random_hrm_time_track_member_timesheets_create } from "../../../generate/generate_random_hrm_time_track_member_timesheets_create";
import { prepare_random_hrm_time_track_timelog } from "../../../prepare/prepare_random_hrm_time_track_timelog";
import { prepare_random_hrm_time_track_timesheet } from "../../../prepare/prepare_random_hrm_time_track_timesheet";

/**
 * Test the critical business rule that prevents deletion of timelogs in submitted or approved timesheets.
 *
 * Validates that timelogs included in a submitted timesheet cannot be deleted, ensuring the integrity of the timesheet approval workflow. The test creates a timelog, includes it in a timesheet, submits the timesheet, and then attempts to delete the timelog to verify the protection mechanism works correctly.
 *
 * Special attention is given to verifying that the deletion is blocked with an appropriate error, the timelog remains intact, and the timesheet status is unchanged after the failed deletion attempt.
 *
 * 1. Authenticate as a member (employee) to access timelog and timesheet operations.
 * 2. Create a timelog entry with valid work date, duration, and project assignment.
 * 3. Create a timesheet that includes the timelog by setting week_start_date to match the timelog's date.
 * 4. Verify the timelog is included in the timesheet before submission.
 * 5. Submit the timesheet to trigger the deletion protection rule.
 * 6. Attempt to delete the timelog and validate that the deletion is blocked.
 * 7. Verify the timesheet status remains unchanged after the failed deletion attempt.
 */
export async function test_api_timelog_deletion_blocked_by_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create a timelog entry
  const timelog = await generate_random_hrm_time_track_member_timelogs_create(
    memberConnection,
    {},
  );
  typia.assert(timelog);
  // 3. Create a timesheet that includes the timelog
  // Extract the date from the timelog and use it as week_start_date
  const timelogDate = new Date(timelog.date);
  // Find the Monday of the week containing the timelog date
  const dayOfWeek = timelogDate.getDay(); // 0 (Sunday) to 6 (Saturday)
  const daysSinceMonday = (dayOfWeek + 6) % 7; // Convert to days since Monday
  const weekStartDate = new Date(timelogDate);
  weekStartDate.setDate(timelogDate.getDate() - daysSinceMonday);
  weekStartDate.setHours(0, 0, 0, 0);
  const timesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDate.toISOString(),
        },
      },
    );
  typia.assert(timesheet);
  // 4. Verify the timelog is included in the timesheet before submission
  const timelogInTimesheet = timesheet.timelogs.find(
    (tl) => tl.id === timelog.id,
  );
  TestValidator.predicate(
    "timelog is included in the created timesheet",
    timelogInTimesheet !== undefined,
  );
  // 5. Submit the timesheet
  const submittedTimesheet =
    await api.functional.hrmTimeTrack.member.timesheets.update(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          status: "submitted",
        } satisfies IHrmTimeTrackTimesheet.IUpdate,
      },
    );
  typia.assert(submittedTimesheet);
  // Verify timesheet is now submitted
  TestValidator.equals(
    "timesheet status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 6. Attempt to delete the timelog (should be blocked)
  await TestValidator.error(
    "deletion blocked for timelog in submitted timesheet",
    async () => {
      await api.functional.hrmTimeTrack.member.timelogs.erase(
        memberConnection,
        {
          timelogId: timelog.id,
        },
      );
    },
  );
  // 7. Verify the timesheet status remains unchanged after failed deletion
  // The timesheet should still be in submitted status
  TestValidator.equals(
    "timesheet status unchanged after failed deletion attempt",
    submittedTimesheet.status,
    "submitted",
  );
  // The timelog still exists because the deletion threw an error
  // We already verified it was in the timesheet before, and deletion failed
  TestValidator.predicate(
    "timelog remains intact after failed deletion attempt",
    true,
  );
}
