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

export async function test_api_project_member_index_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager joins (creates manager account)
  const managerConnection: api.IConnection = { host: connection.host };
  const managerMember = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(),
      lastName: RandomGenerator.name(),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(managerMember);
  // 2. Manager creates organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Manager creates a role with project management permission
  const managerRole = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        permissions: [
          {
            permission: "project.manage",
          } satisfies IErpHrmRolePermission.ICreate,
          {
            permission: "organization.manage",
          } satisfies IErpHrmRolePermission.ICreate,
        ],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(managerRole);
  // 4. Manager creates organization member for themselves
  const managerOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: managerMember.id,
          roleId: managerRole.id,
          departmentId: null,
          position: RandomGenerator.name(),
          employmentType: "full_time" as const,
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(managerOrgMember);
  // 5. Manager creates project
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: null,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        budgetHours: null,
        startDate: null,
        endDate: null,
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // 6. Create an employee role without project management permission
  const employeeRole = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        permissions: [],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(employeeRole);
  // 7. Create project lead organization member
  const projectLeadMember = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        firstName: RandomGenerator.name(),
        lastName: RandomGenerator.name(),
        avatarUrl: null,
        timezone: null,
        locale: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IErpHrmMember.IJoin,
    },
  );
  typia.assert(projectLeadMember);
  const projectLeadOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: projectLeadMember.id,
          roleId: employeeRole.id,
          departmentId: null,
          position: RandomGenerator.name(),
          employmentType: "full_time" as const,
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(projectLeadOrgMember);
  // 8. Assign project lead to the project
  const projectLeadAssignment =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: projectLeadOrgMember.id,
          role: "project-lead",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectLeadAssignment);
  // 9. Create regular organization member
  const regularMember = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        firstName: RandomGenerator.name(),
        lastName: RandomGenerator.name(),
        avatarUrl: null,
        timezone: null,
        locale: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IErpHrmMember.IJoin,
    },
  );
  typia.assert(regularMember);
  const regularOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: regularMember.id,
          roleId: employeeRole.id,
          departmentId: null,
          position: RandomGenerator.name(),
          employmentType: "full_time" as const,
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(regularOrgMember);
  // 10. Assign regular member to the project for the lead to view
  const regularMemberAssignment =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: regularOrgMember.id,
          role: "member",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(regularMemberAssignment);
  // 11. Project lead authenticates
  const projectLeadConnection: api.IConnection = { host: connection.host };
  // Project lead needs to login with credentials - but we authorized_member_join returns token
  // So we need to reauthenticate or use the connection from join
  // The join already returns authorized with token, so we can use projectLeadMember.token
  projectLeadConnection.headers = {
    ...projectLeadConnection.headers,
    Authorization: projectLeadMember.token.access,
  };
  // 12. Project lead calls index endpoint to retrieve members
  const memberList = await api.functional.erpHrm.member.projects.members.index(
    projectLeadConnection,
    {
      projectId: project.id,
      body: {
        search: null,
        role: null,
        organizationMemberId: null,
        sort: null,
        cursor: null,
        limit: null,
        page: null,
      } satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(memberList);
  // 13. Validate response - business logic checks only
  TestValidator.predicate("member list has data", memberList.data.length >= 2);
  TestValidator.equals(
    "member count matches expected",
    memberList.data.length,
    2,
  );
  // Verify both project lead and regular member are in the list
  const memberIds = memberList.data.map((m) => m.id);
  TestValidator.predicate(
    "project lead is in member list",
    memberIds.includes(projectLeadAssignment.id),
  );
  TestValidator.predicate(
    "regular member is in member list",
    memberIds.includes(regularMemberAssignment.id),
  );
}
