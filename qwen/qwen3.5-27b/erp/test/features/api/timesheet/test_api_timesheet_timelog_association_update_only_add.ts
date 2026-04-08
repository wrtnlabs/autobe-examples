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
 * Test adding multiple timelogs to a draft timesheet without removing any existing timelogs.
 *
 * Validates the timesheet timelog association update operation where only timelogs are added to a draft timesheet. The test ensures that multiple timelogs can be added in a single request, the timesheet remains in draft status, and the updated_at timestamp is properly modified.
 *
 * Special attention is given to verifying that the timelog associations are correctly maintained, the timesheet's timelogs array includes all newly added timelogs, and the empty remove array is processed without errors.
 *
 * 1. Authenticate as a member (employee) in an organization.
 * 2. Create a project within the organization for timelog association.
 * 3. Create a draft timesheet for a specific week.
 * 4. Create multiple timelogs for dates within that week that are not yet in the timesheet.
 * 5. Call PATCH /hrmTimeTrack/member/timesheets/{timesheetId}/timelogs with add array containing multiple timelog IDs and empty remove array.
 * 6. Verify the response returns the updated timesheet with all specified timelogs added.
 * 7. Validate that the timesheet status remains 'draft' and updated_at timestamp has changed.
 */
export async function test_api_timesheet_timelog_association_update_only_add(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create a project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a draft timesheet for this week
  const thisWeekMonday = new Date();
  thisWeekMonday.setDate(
    thisWeekMonday.getDate() - thisWeekMonday.getDay() + 1,
  );
  thisWeekMonday.setHours(0, 0, 0, 0);
  const timesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: thisWeekMonday.toISOString(),
        },
      },
    );
  typia.assert(timesheet);
  const initialTimelogCount = timesheet.timelogs.length;
  // 4. Create multiple timelogs for dates within the week
  const timelog1 = await generate_random_hrm_time_track_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: thisWeekMonday.toISOString(),
        duration_seconds: 3600,
        hrm_time_track_project_id: project.id,
        billable: true,
        notes: "First timelog for testing",
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_hrm_time_track_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: new Date(thisWeekMonday.getTime() + 86400000).toISOString(),
        duration_seconds: 7200,
        hrm_time_track_project_id: project.id,
        billable: false,
        notes: "Second timelog for testing",
      },
    },
  );
  typia.assert(timelog2);
  // 5. Update timesheet to add both timelogs with empty remove array
  const updatedTimesheet =
    await api.functional.hrmTimeTrack.member.timesheets.timelogs.update(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          add: [timelog1.id, timelog2.id],
          remove: [],
        } satisfies IHrmTimeTrackTimesheet.ITimelogUpdate,
      },
    );
  typia.assert(updatedTimesheet);
  // 6. Verify timelogs were added
  TestValidator.equals(
    "timelog count increased by 2",
    updatedTimesheet.timelogs.length,
    initialTimelogCount + 2,
  );
  TestValidator.predicate(
    "timelog1 is in timesheet",
    updatedTimesheet.timelogs.some((tl) => tl.id === timelog1.id),
  );
  TestValidator.predicate(
    "timelog2 is in timesheet",
    updatedTimesheet.timelogs.some((tl) => tl.id === timelog2.id),
  );
  // 7. Validate timesheet status remains draft
  TestValidator.equals(
    "timesheet status remains draft",
    updatedTimesheet.status,
    "draft",
  );
  // 8. Validate updated_at changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    timesheet.updated_at,
    updatedTimesheet.updated_at,
  );
}
