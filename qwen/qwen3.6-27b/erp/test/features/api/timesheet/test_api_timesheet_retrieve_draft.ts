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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test retrieving a draft timesheet for an employee.
 *
 * Validates the complete workflow from member registration through draft timesheet retrieval. Registers a new member, creates a project and timelogs for the week, then creates a draft timesheet that auto-aggregates those timelogs. Retrieves the draft timesheet by ID to verify structure and content.
 *
 * Special attention is given to validating that draft timesheets properly represent the pre-submission state: total hours are auto-calculated from included timelogs, submission and approval metadata fields remain null, and the timelogs array contains all weekly time entries for the employee.
 *
 * 1. Register and authenticate a new member (auto-creates organization and employee record).
 * 2. Create a project within the organization for timelog associations.
 * 3. Create timelogs for the current week against the project.
 * 4. Create a draft timesheet that auto-aggregates the weekly timelogs.
 * 5. Retrieve the draft timesheet by ID and validate its structure.
 * 6. Verify draft state: status is 'draft', total_hours matches included timelogs, submission/review metadata are null.
 */
export async function test_api_timesheet_retrieve_draft(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create timelogs for the current week
  const now = new Date();
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  thisMonday.setHours(0, 0, 0, 0);
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: thisMonday.toISOString(),
        durationMinutes: 120,
      },
    },
  );
  typia.assert(timelog1);
  const dayAfter = new Date(thisMonday);
  dayAfter.setDate(thisMonday.getDate() + 1);
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: dayAfter.toISOString(),
        durationMinutes: 90,
      },
    },
  );
  typia.assert(timelog2);
  // 4. Create draft timesheet (auto-aggregates timelogs for the week)
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    { body: { week_start_date: thisMonday.toISOString() } },
  );
  typia.assert(timesheet);
  // 5. Retrieve the draft timesheet by ID
  const retrieved = await api.functional.hrmPlatform.member.timesheets.at(
    memberConnection,
    { timesheetId: timesheet.id },
  );
  typia.assert(retrieved);
  // 6. Validate draft state
  TestValidator.equals("timesheet ID matches", retrieved.id, timesheet.id);
  TestValidator.equals("status is draft", retrieved.status, "draft");
  TestValidator.equals("total hours positive", retrieved.total_hours > 0, true);
  TestValidator.equals("submitted_at is null", retrieved.submitted_at, null);
  TestValidator.equals("reviewed_at is null", retrieved.reviewed_at, null);
  TestValidator.equals("reviewer is null", retrieved.reviewer, null);
  TestValidator.equals(
    "rejection_reason is null",
    retrieved.rejection_reason,
    null,
  );
  TestValidator.predicate("timelogs populated", retrieved.timelogs.length > 0);
  TestValidator.equals(
    "employee ID matches",
    retrieved.employee.id,
    timesheet.employee.id,
  );
  // Validate total minutes from timelogs
  const totalMinutesFromTimelogs = retrieved.timelogs.reduce(
    (sum, tl) => sum + tl.duration_minutes,
    0,
  );
  const calculatedTotalHours = totalMinutesFromTimelogs / 60;
  TestValidator.equals(
    "total hours matches timelog sum",
    retrieved.total_hours,
    calculatedTotalHours,
  );
}
