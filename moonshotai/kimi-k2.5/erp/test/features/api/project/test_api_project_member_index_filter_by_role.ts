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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
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

export async function test_api_project_member_index_filter_by_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager connection
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create role with project management permission
  const role = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: "Project Manager",
        permissions: [{ permission: "project.manage" }],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Create organization member for manager
  const managerUser = await authorize_member_join(
    { host: connection.host } as api.IConnection,
    {},
  );
  const managerOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: managerUser.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(managerOrgMember);
  // 5. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(project);
  // 6. Create first organization member for project lead
  const leadUser = await authorize_member_join(
    { host: connection.host } as api.IConnection,
    {},
  );
  const leadOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: leadUser.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(leadOrgMember);
  // 7. Assign first member as project lead
  const projectLead =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: leadOrgMember.id,
          role: "project-lead",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectLead);
  // 8. Create second organization member for regular member
  const memberUser = await authorize_member_join(
    { host: connection.host } as api.IConnection,
    {},
  );
  const memberOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: memberUser.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(memberOrgMember);
  // 9. Assign second member as regular project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: memberOrgMember.id,
          role: "member",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 10. Query project members filtered by role 'project-lead'
  const filteredMembers =
    await api.functional.erpHrm.member.projects.members.index(
      managerConnection,
      {
        projectId: project.id,
        body: {
          role: "project-lead",
        } satisfies IErpHrmProjectMember.IRequest,
      },
    );
  typia.assert(filteredMembers);
  // 11. Validate filtering results - should only contain project lead
  TestValidator.equals(
    "project lead count",
    filteredMembers.pagination.records,
    1,
  );
  TestValidator.equals("data array length", filteredMembers.data.length, 1);
  TestValidator.equals(
    "filtered member role",
    filteredMembers.data[0].role,
    "project-lead",
  );
  TestValidator.equals(
    "project lead id matches",
    filteredMembers.data[0].id,
    projectLead.id,
  );
  // 12. Verify nested organization member details
  TestValidator.equals(
    "organization member id matches",
    filteredMembers.data[0].organizationMember.id,
    leadOrgMember.id,
  );
  TestValidator.equals(
    "user email matches",
    filteredMembers.data[0].organizationMember.user.email,
    leadUser.email,
  );
  // 13. Test with pagination parameters
  const paginatedMembers =
    await api.functional.erpHrm.member.projects.members.index(
      managerConnection,
      {
        projectId: project.id,
        body: {
          role: "project-lead",
          limit: 10,
          page: 1,
        } satisfies IErpHrmProjectMember.IRequest,
      },
    );
  typia.assert(paginatedMembers);
  // 14. Validate pagination
  TestValidator.equals(
    "paginated records count",
    paginatedMembers.pagination.records,
    1,
  );
  TestValidator.equals(
    "paginated limit",
    paginatedMembers.pagination.limit,
    10,
  );
  TestValidator.equals(
    "paginated current page",
    paginatedMembers.pagination.current,
    1,
  );
}
