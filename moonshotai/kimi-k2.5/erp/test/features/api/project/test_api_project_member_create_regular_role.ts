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

export async function test_api_project_member_create_regular_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with project management permission
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
    },
  });
  typia.assert(manager);
  // 2. Create an organization with operational settings (timezone: Asia/Seoul, currency: KRW)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_year_start_month: 1,
        } satisfies IErpHrmOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create a custom role with project management permission
  const role = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        permissions: [
          {
            permission: "project.manage",
          } satisfies IErpHrmRolePermission.ICreate,
        ],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Create an organization member (employee) with this role for the manager
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
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(managerOrgMember);
  // 5. Create a project with name "Q2 Marketing Campaign", budget hours, and date range
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {
      body: {
        name: "Q2 Marketing Campaign",
        budgetHours: 1000,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // 6. Create another organization member to be assigned to the project
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
    },
  });
  typia.assert(employee);
  const employeeRole = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        permissions: [],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(employeeRole);
  const employeeOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employee.id,
          roleId: employeeRole.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(employeeOrgMember);
  // 7. Call POST /erpHrm/member/projects/{projectId}/members with the newly created employee's organizationMemberId and role='member'
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          organizationMemberId: employeeOrgMember.id,
          role: "member",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // Validation Points
  TestValidator.equals("role is member", projectMember.role, "member");
  TestValidator.equals(
    "project id matches",
    projectMember.project.id,
    project.id,
  );
  TestValidator.equals(
    "organization member id matches",
    projectMember.organizationMember.id,
    employeeOrgMember.id,
  );
  TestValidator.equals("deletedAt is null", projectMember.deletedAt, null);
  TestValidator.predicate("createdAt exists", !!projectMember.createdAt);
  TestValidator.predicate("updatedAt exists", !!projectMember.updatedAt);
}
