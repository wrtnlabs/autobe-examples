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

export async function test_api_project_member_create_lead_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with project management permission
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
    } satisfies Partial<IErpHrmMember.IJoin>,
  });
  typia.assert(manager);
  // 2. Create an organization with standard operational settings
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        } satisfies Partial<IErpHrmOrganization.ICreate>,
      },
    );
  typia.assert(organization);
  // 3. Create a role with project management permission
  const role = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: [
          {
            permission: "project.manage",
          } satisfies IErpHrmRolePermission.ICreate,
        ],
      } satisfies Partial<IErpHrmRole.ICreate>,
    },
  );
  typia.assert(role);
  // 4. Create the manager organization member with this role
  const managerOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: manager.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies Partial<IErpHrmOrganizationMember.ICreate>,
      },
    );
  typia.assert(managerOrgMember);
  // 5. Create a project for team collaboration
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies Partial<IErpHrmProject.ICreate>,
    },
  );
  typia.assert(project);
  // 6. Create an organization member who will be designated as project lead
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
    } satisfies Partial<IErpHrmMember.IJoin>,
  });
  typia.assert(targetMember);
  const targetOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: targetMember.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies Partial<IErpHrmOrganizationMember.ICreate>,
      },
    );
  typia.assert(targetOrgMember);
  // 7. Call POST /erpHrm/member/projects/{projectId}/members with organizationMemberId and role='project-lead'
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          organizationMemberId: targetOrgMember.id,
          role: "project-lead",
        } satisfies Partial<IErpHrmProjectMember.ICreate>,
      },
    );
  typia.assert(projectMember);
  // Validation Points
  TestValidator.equals(
    "role should be project-lead",
    projectMember.role,
    "project-lead",
  );
  TestValidator.equals(
    "organizationMember user id should match",
    projectMember.organizationMember.user.id,
    targetMember.id,
  );
  TestValidator.equals(
    "project id should match",
    projectMember.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name should match",
    projectMember.project.name,
    project.name,
  );
  TestValidator.predicate(
    "project colorCode exists",
    projectMember.project.colorCode !== undefined,
  );
  TestValidator.predicate(
    "project description exists",
    projectMember.project.description !== undefined,
  );
  TestValidator.predicate(
    "project status exists",
    projectMember.project.status !== undefined,
  );
  TestValidator.predicate(
    "project budgetHours exists",
    projectMember.project.budgetHours !== undefined,
  );
  TestValidator.predicate(
    "project startDate exists",
    projectMember.project.startDate !== undefined,
  );
  TestValidator.predicate(
    "project endDate exists",
    projectMember.project.endDate !== undefined,
  );
}
