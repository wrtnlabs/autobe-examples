import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganization";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_departments_create } from "../../../generate/generate_random_hrms_member_organizations_departments_create";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_department } from "../../../prepare/prepare_random_hrms_department";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_timelog_update_in_submitted_timesheet_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member (creates organization implicitly)
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // Get organization from member
  const organizationId: string =
    member.organization_memberships[0].organization.id;
  typia.assert(organizationId);
  // 2. Create department
  const department: IHrmsDepartment =
    await generate_random_hrms_member_organizations_departments_create(
      memberConnection,
      {
        body: { name: RandomGenerator.name() },
        params: { organizationId },
      },
    );
  typia.assert(department);
  // 3. Create employee
  const employeeId: string = typia.random<string & tags.Format<"uuid">>();
  const employee: IHrmsEmployee =
    await api.functional.hrms.member.organizations.employees.update(
      memberConnection,
      {
        organizationId,
        employeeId,
        body: {
          display_name: RandomGenerator.name(),
          position: RandomGenerator.paragraph({ sentences: 1 }),
          employment_type: RandomGenerator.pick([
            "full-time",
            "part-time",
            "contractor",
            "intern",
          ]),
          department_id: department.id,
          status: "active",
        } satisfies IHrmsEmployee.IUpdate,
      },
    );
  typia.assert(employee);
  const employeeIdUUID: string = employee.id;
  // 4. Create project
  const project: IHrmsProject =
    await generate_random_hrms_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: `#${typia.random<string & tags.Format<"uuid">>().replace(/-/g, "")}`,
        },
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 5. Add employee to project
  const projectMember: IHrmsProjectMember =
    await generate_random_hrms_member_projects_members_add_member(
      memberConnection,
      {
        body: { employee_id: employeeIdUUID, role: "member" },
        params: { projectId: (project as any).id },
      },
    );
  typia.assert(projectMember);
  // 6. Create timelog
  const timelogDate: string = new Date().toISOString();
  const timelog: IHrmsTimelog =
    await generate_random_hrms_member_organizations_employees_timelogs_create(
      memberConnection,
      {
        body: {
          date: timelogDate,
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<480>
          >(),
          project_id: (project as any).id,
          billable: true,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: { organizationId, employeeId: employeeIdUUID },
      },
    );
  typia.assert(timelog);
  const timelogId: string = (timelog as any).id;
  // Verify timelog exists and has initial values
  const initialDuration: number = (timelog as any).duration_minutes;
  const initialDescription: string | undefined = (timelog as any).description;
  // 7. Create timesheet for the week containing the timelog date
  const timelogDateObj: Date = new Date(timelogDate);
  const weekStart: Date = new Date(timelogDateObj);
  const dayOfWeek: number = weekStart.getDay(); // 0 = Sunday, 1 = Monday
  const mondayOffset: number = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(weekStart.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const timesheet: IHrmsTimesheet =
    await generate_random_hrms_member_timesheets_create(memberConnection, {
      body: { week_start_date: weekStart.toISOString() },
    });
  typia.assert(timesheet);
  // 8. Submit timesheet
  const submittedTimesheet: IHrmsTimesheet =
    await api.functional.hrms.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status",
    submittedTimesheet.status,
    "submitted",
  );
  // 9. Attempt to update timelog (should fail with 409 Conflict)
  const updateDuration: number = initialDuration + 60;
  const updateDescription: string = "Updated description";
  await TestValidator.httpError(
    "timelog update in submitted timesheet should fail",
    409,
    async () => {
      const updateResult: IHrmsTimelog =
        await api.functional.hrms.member.timelogs.update(memberConnection, {
          timelogId: timelogId,
          body: {
            duration_minutes: updateDuration,
            description: updateDescription,
          } satisfies IHrmsTimelog.IUpdate,
        });
      typia.assert(updateResult);
    },
  );
  // 10. Verify timelog data remains unchanged by attempting update with same values
  const verificationTimelog: IHrmsTimelog =
    await api.functional.hrms.member.timelogs.update(memberConnection, {
      timelogId: timelogId,
      body: {
        duration_minutes: initialDuration,
        description: initialDescription,
      } satisfies IHrmsTimelog.IUpdate,
    });
  typia.assert(verificationTimelog);
  TestValidator.equals(
    "duration unchanged",
    (verificationTimelog as any).duration_minutes,
    initialDuration,
  );
  TestValidator.equals(
    "description unchanged",
    (verificationTimelog as any).description,
    initialDescription,
  );
}