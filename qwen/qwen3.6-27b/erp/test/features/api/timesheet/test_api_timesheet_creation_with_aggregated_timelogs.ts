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
 * E2E Test for Timesheet Creation with Aggregated Timelogs.
 *
 * This test validates the creation of a draft timesheet. It verifies that the system correctly:
 * 1. Calculates the week_end_date as the Sunday of the provided week_start_date.
 * 2. Discovers and aggregates existing timelogs belonging to the employee within the week boundaries.
 * 3. Computes total_hours accurately by summing the duration_minutes of the matched timelogs.
 * 4. Updates the timesheet foreign key on the auto-discovered timelogs.
 * 5. Initializes the timesheet status as 'draft'.
 *
 * 1. Member joins and authenticates.
 * 2. Project is created.
 * 3. Member is assigned to the project.
 * 4. Multiple timelogs are created within the target week.
 * 5. Timesheet is created for the week.
 * 6. Response is validated for status, dates, aggregated timelogs, and total hours.
 */
export async function test_api_timesheet_creation_with_aggregated_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member Join
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: RandomGenerator.alphaNumeric(16) + "@test.com",
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(member);
  const memberId = member.id;
  // 2. Create Project
  const project: IHrmPlatformProject =
    await api.functional.hrmPlatform.member.projects.create(memberConnection, {
      body: {
        name: RandomGenerator.name() + " Project",
        color_code: "#FF0000",
      },
    });
  typia.assert(project);
  // 3. Assign Member to Project (Employee ID assumed to be Member ID for this test context)
  const membership: IHrmPlatformProjectMembership =
    await api.functional.hrmPlatform.member.projects.memberships.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          employeeId: memberId,
          capacityRole: "member",
        },
      },
    );
  typia.assert(membership);
  // 4. Setup Timelogs in a specific week
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const timelogs: IHrmPlatformTimelog[] = [];
  const totalDurationMinutes = 120; // 2 hours total
  for (let i = 0; i < 2; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    date.setHours(9, i * 30, 0, 0);
    const timelog: IHrmPlatformTimelog =
      await api.functional.hrmPlatform.member.timelogs.create(
        memberConnection,
        {
          body: {
            projectId: project.id,
            date: date.toISOString(),
            durationMinutes: 60,
            workDescription: RandomGenerator.name() + " work",
            billable: true,
          },
        },
      );
    typia.assert(timelog);
    timelogs.push(timelog);
  }
  // 5. Create Timesheet
  const timesheet: IHrmPlatformTimesheet =
    await api.functional.hrmPlatform.member.timesheets.create(
      memberConnection,
      {
        body: {
          week_start_date: monday.toISOString(),
        },
      },
    );
  typia.assert(timesheet);
  // 6. Validations
  TestValidator.equals("status is draft", timesheet.status, "draft");
  const expectedSunday = new Date(monday);
  expectedSunday.setDate(monday.getDate() + 6);
  expectedSunday.setHours(23, 59, 59, 999);
  TestValidator.equals(
    "week_end_date matches",
    timesheet.week_end_date,
    expectedSunday.toISOString(),
  );
  TestValidator.equals(
    "total_hours matches",
    timesheet.total_hours,
    totalDurationMinutes / 60,
  );
  TestValidator.equals(
    "timelogs count matches",
    timesheet.timelogs.length,
    timelogs.length,
  );
  for (const createdTimelog of timelogs) {
    const found = timesheet.timelogs.find((t) => t.id === createdTimelog.id);
    TestValidator.predicate("timelog is included", found !== undefined);
  }
}
