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

/**
 * Test the successful update of a project member's role from 'member' to 'project-lead'.
 * A project manager with project management permission should be able to promote a regular
 * member to a project lead, granting them task management authority within the project.
 * The validation confirms that the updated_at timestamp is refreshed, the role field is
 * changed to 'project-lead', and the response includes the complete project member record.
 */
export async function test_api_project_member_role_promotion_to_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member who will have project management permission
  const pmConnection: api.IConnection = { host: connection.host };
  const pmUser = await authorize_member_join(pmConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
      avatarUrl: null,
      timezone: "Asia/Seoul",
      locale: "en-US",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(pmUser);
  // 2. Create an organization as the authenticated member
  const organization =
    await generate_random_erp_hrm_member_organizations_create(pmConnection, {
      body: {
        name: RandomGenerator.name(3),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_year_start_month: 1,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmOrganization.ICreate,
    });
  typia.assert(organization);
  // 3. Create a custom role with project management permission
  const role = await generate_random_erp_hrm_member_roles_create(pmConnection, {
    body: {
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 1 }),
      permissions: [
        { permission: "project.manage" },
      ] satisfies IErpHrmRolePermission.ICreate[],
    } satisfies IErpHrmRole.ICreate,
  });
  typia.assert(role);
  // 4. Create the organization member record linking the test user to the organization
  // with the project management role
  const orgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      pmConnection,
      {
        body: {
          organizationId: organization.id,
          userId: pmUser.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
          position: "Project Manager",
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(orgMember);
  // 5. Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    pmConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        colorCode: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // 6. Create a project member assignment with 'member' role that will be promoted
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(pmConnection, {
      params: { projectId: project.id },
      body: {
        organizationMemberId: orgMember.id,
        role: "member",
      } satisfies IErpHrmProjectMember.ICreate,
    });
  typia.assert(projectMember);
  TestValidator.equals("initial role is member", projectMember.role, "member");
  const originalUpdatedAt = projectMember.updatedAt;
  // 7. Update the project member's role to 'project-lead'
  const updatedMember =
    await api.functional.erpHrm.member.projects.members.update(pmConnection, {
      projectId: project.id,
      projectMemberId: projectMember.id,
      body: {
        role: "project-lead",
      } satisfies IErpHrmProjectMember.IUpdate,
    });
  typia.assert(updatedMember);
  // 8. Validate that the role is changed to 'project-lead' and updated_at is refreshed
  TestValidator.equals(
    "role changed to project-lead",
    updatedMember.role,
    "project-lead",
  );
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    () =>
      new Date(updatedMember.updatedAt).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );
  TestValidator.equals(
    "project member id unchanged",
    updatedMember.id,
    projectMember.id,
  );
  TestValidator.equals(
    "organization member reference preserved",
    updatedMember.organizationMember.id,
    orgMember.id,
  );
}
