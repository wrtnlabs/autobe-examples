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
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
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
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test member timesheet update with timelog associations in draft status.
 *
 * Verifies that a member can update a timesheet by providing a list of timelog
 * IDs that belong to the same employee and fall within the timesheet's week period. The system
 * should add new timelogs, remove existing ones not in the list, and recalculate the
 * total_hours. This test ensures that the draft status allows modifications and that the
 * association logic correctly handles additions and removals within the valid time window.
 *
 * 1. Authenticate member and create role with time tracking permissions.
 * 2. Create employee record for the authenticated employee in the organization.
 * 3. Create a project for time tracking context.
 * 4. Assign employee as project member.
 * 5. Create multiple timelogs for the employee within a specific week.
 * 6. Create a draft timesheet that auto-includes weekly timelogs.
 * 7. Update timesheet with subset of timelog IDs to verify additions and removals.
 * 8. Verify total_hours recalculates correctly based on included timelogs.
 * 9. Update timesheet by removing all timelogs to validate empty state handling.
 */
export async function test_api_timesheet_update_draft_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberAuthorized = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2. Setup role with time-related permissions
  const role = await generate_random_hrm_platform_member_roles_create(
    connection,
    {
      body: {
        name: `TestRole-${RandomGenerator.alphabets(8)}`,
        description: "Test role with time tracking permissions",
        permissionKeys: ["time:manage", "employee:view", "project:view"],
      },
    },
  );
  typia.assert(role);
  // 3. Setup employee record with member
  const employee = await generate_random_hrm_platform_member_employees_create(
    connection,
    {
      body: {
        memberId: memberAuthorized.id,
        roleId: role.id,
        employmentType: "full-time",
        position: "Test Engineer",
      },
    },
  );
  typia.assert(employee);
  // 4. Setup project for timelog context
  const project = await generate_random_hrm_platform_member_projects_create(
    connection,
    {
      body: {
        name: `TestProject-${RandomGenerator.alphabets(8)}`,
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 5. Assign employee to project as member
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      connection,
      {
        body: {
          employeeId: employee.id,
          capacityRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(membership);
  // 6. Generate timelogs for employee within a specific week
  const testDate = new Date("2024-01-15T00:00:00.000Z");
  const validTimelogs: IHrmPlatformTimelog[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const dayOffset = index * 1000 * 60 * 60 * 24;
      const generatedTimelog =
        await generate_random_hrm_platform_member_timelogs_create(connection, {
          body: {
            date: new Date(testDate.getTime() + dayOffset).toISOString(),
            durationMinutes: 60 * (index + 1),
            projectId: project.id,
            billable: true,
            workDescription: RandomGenerator.paragraph({ sentences: 1 }),
          },
        });
      return typia.assert(generatedTimelog);
    },
  );
  // 7. Create draft timesheet for the week (auto-includes existing timelogs)
  const timesheetCreateBody = {
    week_start_date: testDate.toISOString(),
  } satisfies IHrmPlatformTimesheet.ICreate;
  const timesheet = await api.functional.hrmPlatform.member.timesheets.create(
    connection,
    { body: timesheetCreateBody },
  );
  typia.assert(timesheet);
  TestValidator.equals(
    "initial timesheet is draft status",
    timesheet.status,
    "draft",
  );
  TestValidator.equals(
    "initial timesheet employee matches member",
    timesheet.employee.id,
    employee.id,
  );
  // 8. Update timesheet with subset of timelog IDs (remove some to test removal logic)
  const allTimelogIds = validTimelogs.map((tl) => tl.id);
  const subsetTimelogIds = allTimelogIds.slice(0, 3); // Include only first 3 timelogs
  const timesheetAfterSubset =
    await api.functional.hrmPlatform.member.timesheets.update(connection, {
      timesheetId: timesheet.id,
      body: {
        timelogIds: subsetTimelogIds,
      } satisfies IHrmPlatformTimesheet.IUpdate,
    });
  typia.assert(timesheetAfterSubset);
  TestValidator.equals(
    "timesheet status remains draft after update",
    timesheetAfterSubset.status,
    "draft",
  );
  // Total hours should now be for 3 timelogs: 60 + 120 + 180 = 360 minutes = 6 hours
  TestValidator.equals(
    "subset total hours equals 6 hours from 3 timelogs",
    timesheetAfterSubset.total_hours,
    6,
  );
  // Verify employee preserved
  TestValidator.equals(
    "updated timesheet employee matches original employee record",
    timesheetAfterSubset.employee.id,
    employee.id,
  );
  // Verify week boundaries preserved
  TestValidator.equals(
    "week_start_date preserved after update",
    timesheetAfterSubset.week_start_date,
    testDate.toISOString(),
  );
  // 9. Update timesheet with all timelog IDs to restore them
  const timesheetWithAll =
    await api.functional.hrmPlatform.member.timesheets.update(connection, {
      timesheetId: timesheet.id,
      body: {
        timelogIds: allTimelogIds,
      } satisfies IHrmPlatformTimesheet.IUpdate,
    });
  typia.assert(timesheetWithAll);
  TestValidator.equals(
    "restored timesheet remains in draft status",
    timesheetWithAll.status,
    "draft",
  );
  // Should have all 5 timelogs: 60 + 120 + 180 + 240 + 300 = 900 minutes = 15 hours
  TestValidator.equals(
    "restored total hours equals 15 hours from all 5 timelogs",
    timesheetWithAll.total_hours,
    15,
  );
  // Verify week boundaries still preserved after second update
  TestValidator.equals(
    "week_start_date preserved after second update",
    timesheetWithAll.week_start_date,
    testDate.toISOString(),
  );
  // 10. Update with empty array to remove all timelogs
  const timesheetEmpty =
    await api.functional.hrmPlatform.member.timesheets.update(connection, {
      timesheetId: timesheet.id,
      body: {
        timelogIds: [],
      } satisfies IHrmPlatformTimesheet.IUpdate,
    });
  typia.assert(timesheetEmpty);
  TestValidator.equals(
    "empty timesheet total hours is zero",
    timesheetEmpty.total_hours,
    0,
  );
  TestValidator.equals(
    "empty timesheet remains in draft status",
    timesheetEmpty.status,
    "draft",
  );
}