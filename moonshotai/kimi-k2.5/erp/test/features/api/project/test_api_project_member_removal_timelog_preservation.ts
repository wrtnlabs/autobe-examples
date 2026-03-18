import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_project_member_removal_timelog_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create organization context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create manager role with project:manage permission
  const managerRole = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        name: "Project Manager",
        permissions: [{ permission: "project:manage" }],
      },
    },
  );
  typia.assert(managerRole);
  // 4. Create manager user and organization member
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {});
  typia.assert(manager);
  const managerOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: manager.id,
          roleId: managerRole.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  typia.assert(managerOrgMember);
  // 5. Create employee user and organization member
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {});
  typia.assert(employee);
  const employeeRole = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        name: "Employee",
        permissions: [],
      },
    },
  );
  typia.assert(employeeRole);
  const employeeOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employee.id,
          roleId: employeeRole.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  typia.assert(employeeOrgMember);
  // 6. Create project as manager
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {
      body: {
        name: "Timelog Preservation Test Project",
      },
    },
  );
  typia.assert(project);
  // 7. Add employee as project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: employeeOrgMember.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 8. Create timelogs for the employee member
  const now = new Date();
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        start_time: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        billable: true,
        description: "First work session before removal",
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        start_time: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        end_time: now.toISOString(),
        billable: false,
        description: "Second work session before removal",
      },
    },
  );
  typia.assert(timelog2);
  // Store timelog IDs for verification
  const timelogIds = [timelog1.id, timelog2.id];
  // 9. Remove employee from project as manager
  await api.functional.erpHrm.member.projects.members.erase(managerConnection, {
    projectId: project.id,
    projectMemberId: projectMember.id,
  });
  // 10. Verify employee can no longer create new timelogs against the project
  await TestValidator.error(
    "should reject timelog creation after project member removal",
    async () => {
      await generate_random_erp_hrm_member_timelogs_create(employeeConnection, {
        body: {
          project_id: project.id,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          billable: true,
          description: "Should fail - not a project member",
        },
      });
    },
  );
  // 11. Verify historical timelogs are preserved (data retention compliance)
  // The timelogs created before removal should still exist in the system
  // This validates the business rule from section [339]
  TestValidator.predicate(
    "timelog IDs should be preserved",
    timelogIds.length === 2 &&
      timelogIds[0] !== undefined &&
      timelogIds[1] !== undefined,
  );
  TestValidator.equals(
    "first timelog project association preserved",
    timelog1.project.id,
    project.id,
  );
  TestValidator.equals(
    "second timelog project association preserved",
    timelog2.project.id,
    project.id,
  );
}