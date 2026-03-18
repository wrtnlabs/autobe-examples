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

export async function test_api_project_member_index_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as manager who will become organization owner
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(manager);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create a custom role with project management permission
  const projectManagerRole = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          { permission: "project.manage" },
          { permission: "project.view" },
        ],
      },
    },
  );
  typia.assert(projectManagerRole);
  // 4. Create manager as organization member with project management role
  const managerOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: manager.id,
          roleId: projectManagerRole.id,
          employmentType: "full_time",
          isActive: true,
          position: "Project Manager",
        },
      },
    );
  typia.assert(managerOrgMember);
  // 5. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        budgetHours: 100,
      },
    },
  );
  typia.assert(project);
  // 6. Create additional members to assign to project
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(member2);
  // 7. Create organization members for additional users
  const orgMember1 =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: member1.id,
          roleId: projectManagerRole.id,
          employmentType: "full_time",
          isActive: true,
          position: "Developer",
        },
      },
    );
  typia.assert(orgMember1);
  const orgMember2 =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: member2.id,
          roleId: projectManagerRole.id,
          employmentType: "part_time",
          isActive: true,
          position: "Designer",
        },
      },
    );
  typia.assert(orgMember2);
  // 8. Assign members to project with different roles
  const projectMember1 =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: orgMember1.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember1);
  const projectMember2 =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: orgMember2.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(projectMember2);
  // 9. Query project members list
  const result = await api.functional.erpHrm.member.projects.members.index(
    managerConnection,
    {
      projectId: project.id,
      body: {
        sort: "-created_at",
        limit: 10,
      },
    },
  );
  typia.assert(result);
  // 10. Validate business logic - response contains assigned members
  TestValidator.predicate("has at least 2 members", result.data.length >= 2);
  TestValidator.predicate(
    "total records count matches",
    result.pagination.records >= 2,
  );
  // Validate specific members are in results
  const memberIds = result.data.map((m) => m.id);
  TestValidator.predicate(
    "contains project member 1",
    memberIds.includes(projectMember1.id),
  );
  TestValidator.predicate(
    "contains project member 2",
    memberIds.includes(projectMember2.id),
  );
  // Validate role assignments
  const memberRoles = result.data.map((m) => m.role);
  TestValidator.predicate("has member role", memberRoles.includes("member"));
  TestValidator.predicate(
    "has project-lead role",
    memberRoles.includes("project-lead"),
  );
  // Validate nested data - organization member contains user details
  TestValidator.predicate(
    "organization members have user details",
    result.data.every(
      (pm) =>
        pm.organizationMember.user.id !== undefined &&
        pm.organizationMember.user.email !== undefined &&
        pm.organizationMember.user.firstName !== undefined &&
        pm.organizationMember.user.lastName !== undefined,
    ),
  );
  // Validate project reference
  TestValidator.equals(
    "all members belong to same project",
    result.data.every((pm) => pm.project.id === project.id),
    true,
  );
}
