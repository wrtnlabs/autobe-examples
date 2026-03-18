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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_project_member_detail_retrieval_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner member (connection headers updated internally)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create organization (owner auto-assigned with project:manage permission)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Register second (employee) member
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  // 4. Create custom role for employee with limited permissions (project:view)
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          permissions: ["project:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(customRole);
  // 5. Add employee to the organization with custom role
  const orgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: employeeAuth.member.id,
          roleId: customRole.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgMember);
  // 6. Create project as owner
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // 7. Assign employee to project as 'member'
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        body: {
          organizationMemberId: orgMember.id,
          projectRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // Target test: owner retrieves the specific project member detail
  const retrieved = await api.functional.erpHrm.member.projects.members.at(
    ownerConnection,
    {
      projectId: project.id,
      projectMemberId: projectMember.id,
    },
  );
  typia.assert(retrieved);
  // Validate response fields
  TestValidator.equals(
    "projectMember id matches",
    retrieved.id,
    projectMember.id,
  );
  TestValidator.equals("project.id matches", retrieved.project.id, project.id);
  TestValidator.equals(
    "organizationMember.id matches",
    retrieved.organizationMember.id,
    orgMember.id,
  );
  TestValidator.equals(
    "projectRole is member",
    retrieved.projectRole,
    "member",
  );
  TestValidator.equals("deletedAt is null", retrieved.deletedAt, null);
  TestValidator.equals(
    "project status is active",
    retrieved.project.status,
    "active",
  );
  TestValidator.equals(
    "organizationMember status is active",
    retrieved.organizationMember.status,
    "active",
  );
  // Edge case 1: projectMemberId that belongs to a different project -> 404
  const anotherProject = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(anotherProject);
  await TestValidator.error(
    "projectMemberId from different project returns error",
    async () => {
      await api.functional.erpHrm.member.projects.members.at(ownerConnection, {
        projectId: anotherProject.id,
        projectMemberId: projectMember.id,
      });
    },
  );
  // Edge case 2: non-existent projectId -> 404
  await TestValidator.error(
    "non-existent projectId returns error",
    async () => {
      await api.functional.erpHrm.member.projects.members.at(ownerConnection, {
        projectId: typia.random<string & tags.Format<"uuid">>(),
        projectMemberId: projectMember.id,
      });
    },
  );
}
