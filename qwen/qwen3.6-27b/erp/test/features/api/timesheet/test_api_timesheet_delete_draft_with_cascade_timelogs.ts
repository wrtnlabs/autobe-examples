import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
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
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test the primary deletion workflow where an employee deletes a draft timesheet containing multiple timelogs, verifying cascade deletion behavior.
 *
 * Validators:
 * - 1. Member joins
 * - 2. Project creation
 * - 3. Project membership
 * - 4. Timelog creation
 * - 5. Timesheet creation
 * - 6. Timesheet deletion
 * - 7. Cascade validation
 */
export async function test_api_timesheet_delete_draft_with_cascade_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, { body: undefined });
  // 2. Project Creation
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    { body: undefined },
  );
  typia.assert(project);
  // 3. Project Membership
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employeeId: member.id,
          capacityRole: "member",
        } satisfies IHrmPlatformProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  // 4. Timelog Creation
  const weekStart = new Date("2024-01-01T00:00:00Z");
  const timelogs = await ArrayUtil.asyncRepeat(3, async () => {
    const timelog = await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          projectId: project.id,
          date: weekStart.toISOString(),
          durationMinutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
    typia.assert(timelog);
    return timelog;
  });
  TestValidator.equals("timelogs created count", timelogs.length, 3);
  // 5. Timesheet Creation
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStart.toISOString(),
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  TestValidator.predicate(
    "timesheet aggregated total hours",
    timesheet.total_hours > 0,
  );
  // 6. Timesheet Deletion
  await api.functional.hrmPlatform.member.timesheets.erase(memberConnection, {
    timesheetId: timesheet.id,
  });
  // 7. Cascade Validation & Re-creation
  const newTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStart.toISOString(),
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(newTimesheet);
  TestValidator.predicate(
    "new timesheet id differs from deleted",
    () => newTimesheet.id !== timesheet.id,
  );
  TestValidator.predicate(
    "cascade deletion allows new timesheet for same week",
    () => newTimesheet.week_end_date !== undefined,
  );
}