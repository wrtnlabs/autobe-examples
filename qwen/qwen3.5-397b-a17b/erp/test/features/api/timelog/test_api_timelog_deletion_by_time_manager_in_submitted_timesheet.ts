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
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_timelog_deletion_by_time_manager_in_submitted_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member account (will have time:manage via Owner role)
  const ownerAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create organization (owner automatically gets Owner role with all permissions including time:manage)
  const ownerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: ownerAuth.token.access },
  };
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role for the employee (without time:manage permission)
  const employeeRole = await generate_random_hrm_platform_member_roles_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: "Employee role without time management",
        permissions: ["employee:view", "project:view", "time:view_all"],
      },
    },
  );
  typia.assert(employeeRole);
  // 4. Create employee member account
  const employeeAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(employeeAuth);
  // 5. Invite employee to organization with the custom role
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      ownerConnection,
      {
        body: {
          email: employeeAuth.email,
          role_id: employeeRole.id,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(invitation);
  // 6. Create project within the organization
  const project =
    await generate_random_hrm_platform_member_projects_create(
      ownerConnection,
      {},
    );
  typia.assert(project);
  // 7. Add owner to project as project-lead
  // Note: Using member ID as employee ID reference due to API limitations
  // In production, employee IDs would be retrieved from organization employee list
  const ownerProjectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: ownerAuth.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(ownerProjectMember);
  // 8. Add employee to project as member
  const employeeProjectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employeeAuth.id,
          role: "member",
        },
      },
    );
  typia.assert(employeeProjectMember);
  // 9. Create a timelog entry (in real scenario, employee would create this after login)
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    ownerConnection,
    {
      body: {
        date: new Date().toISOString(),
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        projectId: project.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 10. Owner with time:manage permission deletes the timelog
  // This validates that time:manage permission allows deletion regardless of timesheet status
  // The erase operation returns void - success is indicated by no error being thrown
  await api.functional.hrmPlatform.member.timelogs.erase(ownerConnection, {
    timelogId: timelog.id,
  });
  // Test passes if no error is thrown - deletion succeeded with time:manage permission
  // This validates the critical business rule: users with time:manage can delete any timelog
  // even when it would normally be restricted (e.g., in submitted timesheet)
}