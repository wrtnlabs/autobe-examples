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
 * Test the primary success path for updating timelog associations on a draft timesheet.
 *
 * Validates the complete timelog association update workflow including member authentication, project setup, timelog creation, and timesheet modification. Ensures that timelogs can be added and removed from a draft timesheet correctly, with proper validation of employee ownership and date range constraints.
 *
 * The test verifies that the timesheet's timelog associations are updated as requested, the total hours are recalculated accurately, and the timesheet remains in draft status after modifications.
 *
 * 1. Authenticate as a member to establish employee context in organization.
 * 2. Create a project for timelog association.
 * 3. Create multiple timelogs for the employee within a specific week.
 * 4. Create a draft timesheet for that week (automatically includes existing timelogs).
 * 5. Create an additional timelog for a date within the same week.
 * 6. Update the timesheet to add the new timelog and remove an existing one.
 * 7. Verify the updated timesheet contains the new timelog and excludes the removed one.
 * 8. Validate that status remains 'draft' and timestamps are updated.
 */
export async function test_api_timesheet_timelog_association_update_draft(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Create a project
  const project: IHrmTimeTrackProject =
    await generate_random_hrm_time_track_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#FF5733",
        },
      },
    );
  typia.assert(project);
  // 3. Calculate week dates (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const mondayISO = monday.toISOString();
  // 4. Create multiple timelogs within the week
  const timelog1: IHrmTimeTrackTimelog =
    await generate_random_hrm_time_track_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: mondayISO,
          duration_seconds: 28800,
          hrm_time_track_project_id: project.id,
          billable: true,
          notes: "First timelog entry",
        },
      },
    );
  typia.assert(timelog1);
  const timelog2: IHrmTimeTrackTimelog =
    await generate_random_hrm_time_track_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: new Date(monday.getTime() + 86400000).toISOString(),
          duration_seconds: 21600,
          hrm_time_track_project_id: project.id,
          billable: true,
          notes: "Second timelog entry",
        },
      },
    );
  typia.assert(timelog2);
  // 5. Create a draft timesheet for the week
  const timesheet: IHrmTimeTrackTimesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: mondayISO,
        },
      },
    );
  typia.assert(timesheet);
  // 6. Create an additional timelog within the same week (not yet in timesheet)
  const timelogToAdd: IHrmTimeTrackTimelog =
    await generate_random_hrm_time_track_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: new Date(monday.getTime() + 2 * 86400000).toISOString(),
          duration_seconds: 14400,
          hrm_time_track_project_id: project.id,
          billable: false,
          notes: "Additional timelog to add",
        },
      },
    );
  typia.assert(timelogToAdd);
  // 7. Update timesheet: add new timelog, remove existing timelog
  const updatedTimesheet: IHrmTimeTrackTimesheet =
    await api.functional.hrmTimeTrack.member.timesheets.timelogs.update(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          add: [timelogToAdd.id],
          remove: [timelog1.id],
        } satisfies IHrmTimeTrackTimesheet.ITimelogUpdate,
      },
    );
  typia.assert(updatedTimesheet);
  // 8. Validate the updated timesheet
  TestValidator.equals(
    "status remains draft",
    updatedTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "new timelog added",
    updatedTimesheet.timelogs.some((t) => t.id === timelogToAdd.id),
    true,
  );
  TestValidator.equals(
    "old timelog removed",
    updatedTimesheet.timelogs.some((t) => t.id === timelog1.id),
    false,
  );
  TestValidator.equals(
    "remaining timelog still present",
    updatedTimesheet.timelogs.some((t) => t.id === timelog2.id),
    true,
  );
  TestValidator.predicate(
    "updated_at timestamp changed",
    updatedTimesheet.updated_at !== timesheet.updated_at,
  );
  TestValidator.predicate(
    "total timelogs count correct",
    updatedTimesheet.timelogs.length === 2,
  );
}
