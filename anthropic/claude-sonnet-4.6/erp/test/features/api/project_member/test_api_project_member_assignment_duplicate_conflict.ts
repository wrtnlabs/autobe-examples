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

export async function test_api_project_member_assignment_duplicate_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register first member (owner) and create their connection
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // Step 2: Create organization - first member becomes owner with project:manage
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Register second member (the employee to be assigned)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  typia.assert(employeeAuth);
  // Step 4: Create a custom role for the second member within the organization
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      ownerConnection,
      {
        body: {
          name: `employee-role-${RandomGenerator.alphabets(8)}`,
          permissions: ["project:view", "time:manage"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(customRole);
  // Step 5: Add the second member to the organization with active status
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
  // Step 6: Create a project (owner has project:manage permission)
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // Step 7: First assignment - assign second member to the project as 'member'
  const firstAssignment =
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
  typia.assert(firstAssignment);
  // Validate first assignment: deletedAt must be null (active membership)
  TestValidator.equals(
    "first assignment is active",
    firstAssignment.deletedAt,
    null,
  );
  TestValidator.equals(
    "first assignment projectRole is member",
    firstAssignment.projectRole,
    "member",
  );
  TestValidator.equals(
    "first assignment organizationMember matches",
    firstAssignment.organizationMember.id,
    orgMember.id,
  );
  // Step 8: Second (duplicate) assignment - must fail with 409 Conflict
  await TestValidator.error(
    "duplicate project member assignment should fail with 409",
    async () => {
      await api.functional.erpHrm.member.projects.members.create(
        ownerConnection,
        {
          projectId: project.id,
          body: {
            organizationMemberId: orgMember.id,
            projectRole: "project-lead",
          } satisfies IErpHrmProjectMember.ICreate,
        },
      );
    },
  );
}
