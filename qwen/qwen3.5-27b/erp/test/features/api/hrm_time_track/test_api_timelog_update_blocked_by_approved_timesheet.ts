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
 * Test the business rule that prevents employees from updating timelogs that are part of an approved timesheet.
 *
 * Validates the critical business constraint that approved timesheets lock timelogs to ensure time tracking integrity and prevent post-approval modifications. The test verifies that the system correctly checks the timesheet status before allowing updates.
 *
 * 1. Authenticate as a member with email and password.
 * 2. Create a timelog entry with date, duration, and project assignment.
 * 3. Create a timesheet for the week containing the timelog.
 * 4. Approve the timesheet to lock the timelog.
 * 5. Attempt to update the timelog and verify the request is rejected with 403 Forbidden error.
 */
export async function test_api_timelog_update_blocked_by_approved_timesheet(
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
  // 3. Create a timesheet for the week containing the timelog
  const timesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: timelog.date,
        },
      },
    );
  typia.assert(timesheet);
  // 4. Approve the timesheet (transition from draft to approved)
  const approvedTimesheet =
    await api.functional.hrmTimeTrack.member.timesheets.update(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          status: "approved",
        } satisfies IHrmTimeTrackTimesheet.IUpdate,
      },
    );
  typia.assert(approvedTimesheet);
  // 5. Attempt to update the timelog and verify it fails
  await TestValidator.error(
    "timelog update blocked by approved timesheet",
    async () => {
      await api.functional.hrmTimeTrack.member.timelogs.update(
        memberConnection,
        {
          timelogId: timelog.id,
          body: {
            duration_seconds: timelog.duration_seconds + 100,
          } satisfies IHrmTimeTrackTimelog.IUpdate,
        },
      );
    },
  );
}
