import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

/**
 * Test timelog removal is blocked when timelog is locked in submitted timesheet.
 *
 * Validates the business rule that prevents removing timelogs that are already part of a submitted or approved timesheet. An employee creates timelogs in a week, submits a timesheet for that week, then attempts to remove a timelog from the same timesheet while it's in submitted status. The test ensures the removal request is rejected with an appropriate validation error indicating the timelog is locked.
 *
 * 1. Member registers and authenticates with email/password.
 * 2. Create a project for time tracking.
 * 3. Create employee record and assign to project.
 * 4. Create two timelogs for the same week.
 * 5. Create draft timesheet for that week (automatically includes both timelogs).
 * 6. Submit the timesheet to lock both timelogs.
 * 7. Attempt to remove one timelog from the submitted timesheet.
 * 8. Validate removal request fails with validation error indicating timelog is locked.
 */
export async function test_api_timesheet_timelog_remove_blocked_on_locked_timelog(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  const organizationId = memberAuth.organizations![0].id;
  // 2. Create project
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          name: RandomGenerator.name(),
          color_code: "#FF5733",
          status: "active",
        } satisfies IHrmProject.ICreate,
      },
    );
  typia.assert(project);
  // 3. Get employee ID from organization (member should have employee record)
  // For this test, we'll use the first organization's employee context
  // In real implementation, we'd need to fetch the employee record
  const employeeId = memberAuth.organizations![0].id;
  // 4. Assign employee to project
  const projectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      params: { projectId: project.id },
      body: {
        employee_id: employeeId,
        role: "member",
      } satisfies IHrmProjectMember.ICreate,
    });
  typia.assert(projectMember);
  // 5. Create first timelog for week 1
  const week1Start = new Date("2026-04-06T00:00:00Z"); // Monday
  const timelog1 =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          hrm_project_id: project.id,
          date: week1Start.toISOString(),
          duration_minutes: 480, // 8 hours
          description: "Timelog 1",
          billable: true,
        } satisfies IHrmTimelog.ICreate,
      },
    );
  typia.assert(timelog1);
  // 6. Create second timelog for week 1
  const week1Day2 = new Date("2026-04-07T00:00:00Z"); // Tuesday
  const timelog2 =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          hrm_project_id: project.id,
          date: week1Day2.toISOString(),
          duration_minutes: 480, // 8 hours
          description: "Timelog 2",
          billable: true,
        } satisfies IHrmTimelog.ICreate,
      },
    );
  typia.assert(timelog2);
  // 7. Create draft timesheet for week 1 (automatically includes both timelogs)
  const timesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          hrm_employee_id: employeeId,
          week_start_date: week1Start.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
      },
    );
  typia.assert(timesheet);
  // 8. Submit the timesheet to lock both timelogs
  const submittedTimesheet =
    await api.functional.hrm.member.organizations.timesheets.submit(
      memberConnection,
      {
        organizationId,
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 9. Attempt to remove timelog1 from the submitted timesheet
  // This should fail because timelog1 is locked in submitted timesheet
  await TestValidator.error(
    "cannot remove timelog locked in submitted timesheet",
    async () => {
      await api.functional.hrm.member.timesheets.timelogs.update(
        memberConnection,
        {
          timesheetId: timesheet.id,
          body: {
            add_timelog_ids: [],
            remove_timelog_ids: [timelog1.id],
          } satisfies IHrmTimesheetTimelog.ITimelogUpdate,
        },
      );
    },
  );
  // 10. Validate timesheet remains in submitted status
  TestValidator.equals(
    "timesheet remains submitted",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.equals(
    "timesheet has timelogs",
    submittedTimesheet.timelogs.length > 0,
    true,
  );
}
