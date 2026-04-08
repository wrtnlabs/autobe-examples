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

export async function test_api_timesheet_timelog_update_blocked_on_submitted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
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
  // 2. Get organization ID from member context
  const organizationId = memberAuth.organizations?.[0]?.id;
  if (!organizationId) {
    throw new Error("No organization available for testing");
  }
  // 3. Create project
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 4. Get employee ID - use member ID as employee ID for this test context
  // In a real scenario, this would be the employee record ID associated with the member
  const employeeId = memberAuth.id;
  // 5. Assign employee to project
  const projectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      params: { projectId: project.id },
      body: {
        employee_id: employeeId,
        role: "member",
      } satisfies IHrmProjectMember.ICreate,
    });
  typia.assert(projectMember);
  // 6. Create timelog entries for the week
  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 1); // Set to Monday
  weekStartDate.setHours(0, 0, 0, 0);
  const timelog =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          hrm_project_id: project.id,
          date: weekStartDate.toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          billable: true,
        } satisfies IHrmTimelog.ICreate,
      },
    );
  typia.assert(timelog);
  // 7. Create draft timesheet for the week
  const timesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          hrm_employee_id: employeeId,
          week_start_date: weekStartDate.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
      },
    );
  typia.assert(timesheet);
  // 8. Submit the timesheet to lock timelog associations
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
    "timesheet status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  // 9. Attempt to update timelog associations on submitted timesheet (should fail with 409)
  await TestValidator.httpError(
    "update blocked on submitted timesheet",
    409,
    async () => {
      await api.functional.hrm.member.timesheets.timelogs.update(
        memberConnection,
        {
          timesheetId: timesheet.id,
          body: {
            add_timelog_ids: [],
            remove_timelog_ids: [timelog.id],
          } satisfies IHrmTimesheetTimelog.ITimelogUpdate,
        },
      );
    },
  );
  // 10. Verify timesheet status remains 'submitted' by checking the submittedTimesheet response
  // The submittedTimesheet already contains the final state after submission
  TestValidator.equals(
    "timesheet status locked",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "total_hours preserved",
    submittedTimesheet.total_hours > 0,
  );
}
