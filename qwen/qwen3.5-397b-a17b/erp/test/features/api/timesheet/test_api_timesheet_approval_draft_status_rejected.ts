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

export async function test_api_timesheet_approval_draft_status_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization and set up manager with time:approve permission
  const managerAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(managerAuth);
  const managerConnection: api.IConnection = { host: connection.host };
  managerConnection.headers = { Authorization: managerAuth.token.access };
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      managerConnection,
      {},
    );
  typia.assert(organization);
  // Create manager role with time:approve permission
  const managerRole = await generate_random_hrm_platform_member_roles_create(
    managerConnection,
    {
      body: {
        permissions: ["time:approve", "time:view_all", "employee:view"],
      },
    },
  );
  typia.assert(managerRole);
  // 2. Create and invite employee
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeAuth = await authorize_member_join(connection, {
    body: {
      email: employeeEmail,
      password: "Test1234!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(employeeAuth);
  const employeeConnection: api.IConnection = { host: connection.host };
  employeeConnection.headers = { Authorization: employeeAuth.token.access };
  // Invite employee to organization
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      managerConnection,
      {
        body: {
          email: employeeEmail,
          role_id: managerRole.id,
          expires_at: sevenDaysLater.toISOString(),
        },
      },
    );
  typia.assert(invitation);
  // 3. Create project and assign employee as project member
  const project =
    await generate_random_hrm_platform_member_projects_create(
      employeeConnection,
      {},
    );
  typia.assert(project);
  // Get employee ID from auth response (member ID serves as employee ID in this context)
  const employeeId = employeeAuth.id;
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      employeeConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employeeId,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 4. Create timelog entry for the employee
  const today = new Date();
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        date: today.toISOString(),
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        projectId: project.id,
      },
    },
  );
  typia.assert(timelog);
  // 5. Create draft timesheet for the week (Monday to Sunday)
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: monday.toISOString().split("T")[0],
        week_end_date: sunday.toISOString().split("T")[0],
      },
    },
  );
  typia.assert(timesheet);
  // Verify timesheet is in draft status
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.predicate(
    "submitted_at is null for draft",
    timesheet.submitted_at === null,
  );
  TestValidator.predicate(
    "reviewed_at is null for draft",
    timesheet.reviewed_at === null,
  );
  TestValidator.predicate(
    "reviewed_by_employee_id is null for draft",
    timesheet.reviewed_by_employee_id === null,
  );
  // 6. Attempt to approve the draft timesheet (should be rejected with error)
  await TestValidator.error(
    "approve draft timesheet should fail - timesheet must be submitted first",
    async () => {
      await api.functional.hrmPlatform.member.timesheets.approve(
        managerConnection,
        {
          timesheetId: timesheet.id,
        },
      );
    },
  );
  // Validation complete: The error was thrown as expected, proving that
  // draft timesheets cannot be approved. The timesheet remains in draft status
  // with reviewed_at and reviewed_by_employee_id remaining null.
}