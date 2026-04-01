import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
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
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_approval_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization (owner context)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(owner);
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 2. Create Manager role with time:approve permission
  const managerRole = await generate_random_hrm_platform_member_roles_create(
    ownerConnection,
    {
      body: {
        name: "Manager",
        description: "Manager role with time approval permission",
        permissions: ["time:approve", "time:view_all", "employee:view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(managerRole);
  // 3. Create Employee role
  const employeeRole = await generate_random_hrm_platform_member_roles_create(
    ownerConnection,
    {
      body: {
        name: "Employee",
        description: "Standard employee role",
        permissions: ["time:manage", "project:view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(employeeRole);
  // 4. Register manager account (approver)
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(manager);
  // 5. Register employee account (submitter)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employee);
  // 6. Invite employee to organization with Employee role
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      ownerConnection,
      {
        body: {
          email: employee.email,
          role_id: employeeRole.id,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // Invite manager to organization with Manager role
  const managerInvitation =
    await generate_random_hrm_platform_member_invitations_create(
      ownerConnection,
      {
        body: {
          email: manager.email,
          role_id: managerRole.id,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(managerInvitation);
  // 7. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 8. Assign employee to project as member
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: invitation.user?.id ?? employee.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 9. Create timelog entry for the employee
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        date: new Date().toISOString(),
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        projectId: project.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 10. Create draft timesheet for the week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: weekStart.toISOString().split("T")[0],
        week_end_date: weekEnd.toISOString().split("T")[0],
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 11. Submit the timesheet
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      employeeConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // Validate submission
  TestValidator.equals(
    "timesheet status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is populated",
    submittedTimesheet.submitted_at !== null,
  );
  // 12. Approve the timesheet using manager's credentials
  const approvedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.approve(
      managerConnection,
      {
        timesheetId: submittedTimesheet.id,
      },
    );
  typia.assert(approvedTimesheet);
  // Validate approval
  TestValidator.equals(
    "timesheet status after approval",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at is populated",
    approvedTimesheet.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewed_by_employee_id references manager",
    approvedTimesheet.reviewed_by_employee_id !== null,
  );
  TestValidator.equals(
    "reviewed_by matches manager",
    approvedTimesheet.reviewedByEmployee?.user.id,
    manager.id,
  );
  TestValidator.notEquals(
    "status changed from submitted",
    submittedTimesheet.status,
    approvedTimesheet.status,
  );
}