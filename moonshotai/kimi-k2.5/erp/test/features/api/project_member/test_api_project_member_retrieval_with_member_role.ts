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

export async function test_api_project_member_retrieval_with_member_role(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin member who will create all resources
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {});
  typia.assert(adminMember);
  // Step 2: Create an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      adminConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a role with project management permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    adminConnection,
    {
      body: {
        permissions: [
          { permission: "project.manage" },
          { permission: "employee.view" },
        ],
      },
    },
  );
  typia.assert(role);
  // Step 4: Create another user who will be the target organization member
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetConnection, {});
  typia.assert(targetMember);
  // Step 5: Create organization member for the target user
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      adminConnection,
      {
        body: {
          organizationId: organization.id,
          userId: targetMember.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  typia.assert(organizationMember);
  // Step 6: Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // Step 7: Assign the organization member to the project with 'member' role
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: organizationMember.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // Step 8: Retrieve the project member record
  const retrievedProjectMember =
    await api.functional.erpHrm.member.projects.members.at(adminConnection, {
      projectId: project.id,
      projectMemberId: projectMember.id,
    });
  typia.assert(retrievedProjectMember);
  // Step 9: Validate response structure and values
  TestValidator.equals(
    "project member ID matches",
    retrievedProjectMember.id,
    projectMember.id,
  );
  TestValidator.equals("role is member", retrievedProjectMember.role, "member");
  TestValidator.equals(
    "project ID matches",
    retrievedProjectMember.project.id,
    project.id,
  );
  TestValidator.equals(
    "organization member ID matches",
    retrievedProjectMember.organizationMember.id,
    organizationMember.id,
  );
  TestValidator.equals(
    "user ID matches",
    retrievedProjectMember.organizationMember.user.id,
    targetMember.id,
  );
  TestValidator.equals(
    "user email matches",
    retrievedProjectMember.organizationMember.user.email,
    targetMember.email,
  );
  TestValidator.predicate(
    "createdAt exists",
    !!retrievedProjectMember.createdAt,
  );
  TestValidator.predicate(
    "updatedAt exists",
    !!retrievedProjectMember.updatedAt,
  );
}
