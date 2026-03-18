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

export async function test_api_project_member_retrieval_with_project_lead_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  // 3. Create role
  const role = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        permissions: [],
      },
    },
  );
  // 4. Create second member (to be assigned as project lead)
  const memberConnection: api.IConnection = { host: connection.host };
  const projectLeadUser = await authorize_member_join(memberConnection, {});
  // 5. Create organization member
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: projectLeadUser.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  // 6. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
      },
    },
  );
  // 7. Assign organization member to project with project-lead role
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          organizationMemberId: organizationMember.id,
          role: "project-lead",
        },
      },
    );
  // 8. Retrieve the project member record
  const retrievedProjectMember =
    await api.functional.erpHrm.member.projects.members.at(ownerConnection, {
      projectId: project.id,
      projectMemberId: projectMember.id,
    });
  // 9. Validate response
  typia.assert(retrievedProjectMember);
  TestValidator.equals(
    "role is project-lead",
    retrievedProjectMember.role,
    "project-lead",
  );
  TestValidator.equals(
    "project id matches",
    retrievedProjectMember.project.id,
    project.id,
  );
  TestValidator.equals(
    "organization member id matches",
    retrievedProjectMember.organizationMember.id,
    organizationMember.id,
  );
}
