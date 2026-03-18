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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

export async function test_api_project_member_role_demotion_from_lead(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as manager with project management capability
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {});
  // Step 2: Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {},
    );
  // Step 3: Create a role with project management permission
  const managerRole = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: "Project Manager",
        permissions: [{ permission: "project.manage" }],
      },
    },
  );
  // Step 4: Create organization member record for manager with project management role
  await generate_random_erp_hrm_member_organization_members_create(
    managerConnection,
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
  // Step 5: Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  // Step 6: Create target member (to be demoted from project-lead to member)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetUser = await authorize_member_join(targetConnection, {});
  // Step 7: Create organization member record for target user
  const targetOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: targetUser.id,
          roleId: managerRole.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  // Step 8: Create project member with 'project-lead' role
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: targetOrgMember.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(projectMember);
  // Verify initial state: role should be 'project-lead'
  TestValidator.equals(
    "initial project member role should be project-lead",
    projectMember.role,
    "project-lead",
  );
  const beforeUpdateTime = new Date();
  // Step 9: Demote project member from 'project-lead' to 'member'
  const updatedProjectMember =
    await api.functional.erpHrm.member.projects.members.update(
      managerConnection,
      {
        projectId: project.id,
        projectMemberId: projectMember.id,
        body: { role: "member" },
      },
    );
  typia.assert(updatedProjectMember);
  // Step 10: Validate demotion results
  TestValidator.equals(
    "role should be demoted to member",
    updatedProjectMember.role,
    "member",
  );
  TestValidator.predicate(
    "updated_at timestamp should reflect change time",
    new Date(updatedProjectMember.updatedAt) >= beforeUpdateTime,
  );
  TestValidator.equals(
    "membership relationship should be preserved (same id)",
    updatedProjectMember.id,
    projectMember.id,
  );
  TestValidator.equals(
    "project reference should remain unchanged",
    updatedProjectMember.project.id,
    project.id,
  );
  TestValidator.equals(
    "organization member reference should remain unchanged",
    updatedProjectMember.organizationMember.id,
    targetOrgMember.id,
  );
}
