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

export async function test_api_project_member_role_update_unauthorized_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin user with full permissions for test environment setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_member_join(adminConnection, {});
  typia.assert(adminAuth);
  // Step 1: Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      adminConnection,
      {},
    );
  typia.assert(organization);
  // Step 2: Create basic employee role without project management permission
  const basicRole = await generate_random_erp_hrm_member_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: [], // No permissions including project management
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(basicRole);
  // Step 3: Create project lead user (the test subject who lacks org-level permission)
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLeadAuth = await authorize_member_join(
    projectLeadConnection,
    {},
  );
  typia.assert(projectLeadAuth);
  // Step 4: Create organization member for project lead with basic role
  const projectLeadOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      adminConnection,
      {
        body: {
          organizationId: organization.id,
          userId: projectLeadAuth.id,
          roleId: basicRole.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(projectLeadOrgMember);
  // Step 5: Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // Step 6: Assign project lead to project with 'project-lead' role
  // They have project-level authority but no org-level project management permission
  const projectLeadAssignment =
    await generate_random_erp_hrm_member_projects_members_create(
      adminConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          organizationMemberId: projectLeadOrgMember.id,
          role: "project-lead",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectLeadAssignment);
  // Step 7: Create target user (who will be the victim of unauthorized update attempt)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {});
  typia.assert(targetAuth);
  // Step 8: Create organization member for target user
  const targetOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      adminConnection,
      {
        body: {
          organizationId: organization.id,
          userId: targetAuth.id,
          roleId: basicRole.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(targetOrgMember);
  // Step 9: Assign target user to project with 'member' role
  const targetProjectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      adminConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          organizationMemberId: targetOrgMember.id,
          role: "member",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(targetProjectMember);
  // Step 10: Attempt unauthorized role update - project lead without org-level permission
  // attempts to change target member's role. Should fail with 403 Forbidden.
  await TestValidator.httpError(
    "project lead without org-level project management permission cannot update member role",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.members.update(
        projectLeadConnection,
        {
          projectId: project.id,
          projectMemberId: targetProjectMember.id,
          body: {
            role: "project-lead",
          } satisfies IErpHrmProjectMember.IUpdate,
        },
      );
    },
  );
}
