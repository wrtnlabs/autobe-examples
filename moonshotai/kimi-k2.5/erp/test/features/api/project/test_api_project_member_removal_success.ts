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

export async function test_api_project_member_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner user and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies Partial<IErpHrmMember.IJoin>,
  });
  // Step 2: Create organization (owner becomes default member)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(ownerConnection, {
      body: {
        name: RandomGenerator.name(3),
        currency: "USD",
        timezone: "America/New_York",
        fiscal_year_start_month: 1,
      } satisfies Partial<IErpHrmOrganization.ICreate>,
    });
  typia.assert(organization);
  // Step 3: Create role with project:manage permission
  const managerRole = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        permissions: [
          {
            permission: "project.manage",
          } satisfies IErpHrmRolePermission.ICreate,
        ],
      },
    },
  );
  typia.assert(managerRole);
  // Step 4: Create manager user and assign to organization
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies Partial<IErpHrmMember.IJoin>,
  });
  await generate_random_erp_hrm_member_organization_members_create(
    ownerConnection,
    {
      body: {
        organizationId: organization.id,
        userId: managerAuth.id,
        roleId: managerRole.id,
        employmentType: "full_time",
        isActive: true,
      } satisfies Partial<IErpHrmOrganizationMember.ICreate>,
    },
  );
  // Step 5: Create employee user and assign to organization
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies Partial<IErpHrmMember.IJoin>,
  });
  const employeeRole = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        permissions: [] satisfies IErpHrmRolePermission.ICreate[],
      },
    },
  );
  const employeeOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employeeAuth.id,
          roleId: employeeRole.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies Partial<IErpHrmOrganizationMember.ICreate>,
      },
    );
  typia.assert(employeeOrgMember);
  // Step 6: Create project as manager
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        status: "active",
      } satisfies Partial<IErpHrmProject.ICreate>,
    },
  );
  typia.assert(project);
  // Step 7: Assign employee as project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: employeeOrgMember.id,
          role: "member",
        } satisfies Partial<IErpHrmProjectMember.ICreate>,
      },
    );
  typia.assert(projectMember);
  // Validate pre-conditions
  TestValidator.equals(
    "project member should reference correct employee",
    projectMember.organizationMember.user.id,
    employeeAuth.id,
  );
  TestValidator.equals(
    "project member should have member role",
    projectMember.role,
    "member",
  );
  TestValidator.predicate(
    "project member should be active",
    projectMember.deletedAt === null,
  );
  // Step 8: Remove project member (main test action)
  await api.functional.erpHrm.member.projects.members.erase(managerConnection, {
    projectId: project.id,
    projectMemberId: projectMember.id,
  });
  // Step 9: Verify soft deletion by re-adding employee (should create new record)
  const projectMember2 =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: employeeOrgMember.id,
          role: "member",
        } satisfies Partial<IErpHrmProjectMember.ICreate>,
      },
    );
  typia.assert(projectMember2);
  // Verify new record has different ID (proving soft delete of original)
  TestValidator.notEquals(
    "new assignment should have different ID",
    projectMember.id,
    projectMember2.id,
  );
  TestValidator.equals(
    "employee should be re-assignable",
    projectMember2.organizationMember.user.id,
    employeeAuth.id,
  );
}
