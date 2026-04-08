import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
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
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { generate_random_hrm_time_track_member_timelogs_create } from "../../../generate/generate_random_hrm_time_track_member_timelogs_create";
import { generate_random_hrm_time_track_member_timesheets_create } from "../../../generate/generate_random_hrm_time_track_member_timesheets_create";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_timelog } from "../../../prepare/prepare_random_hrm_time_track_timelog";
import { prepare_random_hrm_time_track_timesheet } from "../../../prepare/prepare_random_hrm_time_track_timesheet";

/**
 * Test the business rule that timelog associations can only be modified on draft timesheets, not on submitted or approved timesheets.
 *
 * Validates that attempting to add or remove timelogs from a timesheet that is not in draft status (e.g., submitted, approved, or rejected) is rejected by the system. This ensures data integrity for timesheets that have been submitted for approval or have already been approved.
 *
 * The test creates a complete workflow: member authentication, project creation, timelog creation, timesheet creation, timesheet submission, and then attempts to modify timelog associations on the submitted timesheet. The modification should fail with an appropriate error indicating that only draft timesheets can be modified.
 *
 * 1. Authenticate as a member to establish employee context in organization.
 * 2. Create a project for timelog association.
 * 3. Create multiple timelogs within the same week range.
 * 4. Create a draft timesheet for that week.
 * 5. Submit the timesheet to transition from draft to submitted status.
 * 6. Attempt to add a timelog to the submitted timesheet via PATCH endpoint.
 * 7. Verify the operation is rejected with an error indicating the timesheet is not in draft status.
 */
export async function test_api_timesheet_timelog_association_update_non_draft_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create a project for timelog association
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create timelogs within the same week
  // Create a timelog that will be included in the timesheet
  const timelog1 = await generate_random_hrm_time_track_member_timelogs_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        duration_seconds: 3600,
        billable: true,
        date: "2024-01-08T00:00:00Z", // Monday of a specific week
      },
    },
  );
  typia.assert(timelog1);
  // Create another timelog that will be used to attempt adding to the submitted timesheet
  const timelog2 = await generate_random_hrm_time_track_member_timelogs_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        duration_seconds: 1800,
        billable: false,
        date: "2024-01-09T00:00:00Z", // Tuesday of the same week
      },
    },
  );
  typia.assert(timelog2);
  // 4. Create a draft timesheet for the week
  const timesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: "2024-01-08T00:00:00Z", // Monday
        },
      },
    );
  typia.assert(timesheet);
  // Verify timesheet is in draft status
  TestValidator.equals("timesheet initial status", timesheet.status, "draft");
  // 5. Submit the timesheet to transition to submitted status
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
  // Verify timesheet is now in submitted status
  TestValidator.equals(
    "timesheet submitted status",
    submittedTimesheet.status,
    "submitted",
  );
  // 6. Attempt to add a timelog to the submitted timesheet
  // This should be rejected because the timesheet is not in draft status
  await TestValidator.error(
    "timelog association update rejected on submitted timesheet",
    async () => {
      await api.functional.hrmTimeTrack.member.timesheets.timelogs.update(
        memberConnection,
        {
          timesheetId: timesheet.id,
          body: {
            add: [timelog2.id],
            remove: [],
          } satisfies IHrmTimeTrackTimesheet.ITimelogUpdate,
        },
      );
    },
  );
}
