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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_assignments_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register first member (owner) — connection is auto-updated with token
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // Step 2: Create organization (owner becomes the org owner with full permissions)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Register a second member — connection is auto-updated with token
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuthorized = await authorize_member_join(
    secondMemberConnection,
    {},
  );
  // Step 4: Add the second member to the organization using owner's connection
  const orgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: secondMemberAuthorized.member.id,
          roleId: organization.owner.role.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgMember);
  // Step 5: Create a project within the organization (owner has project:manage permission)
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // Step 6: Assign the second org member to the project with projectRole 'member'
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
  // Step 7: Retrieve paginated list of project assignments as the owner
  const result = await api.functional.erpHrm.member.projectAssignments.index(
    ownerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(result);
  // Step 8: Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records at least 1",
    result.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages at least 1",
    result.pagination.pages >= 1,
  );
  // Step 9: Validate data array is non-empty
  TestValidator.predicate("data array non-empty", result.data.length > 0);
  // Step 10: Find the assignment created in setup and validate its details
  const createdAssignment = result.data.find(
    (item) => item.id === projectMember.id,
  );
  TestValidator.predicate(
    "created assignment appears in result",
    createdAssignment !== undefined,
  );
  if (createdAssignment !== undefined) {
    // Validate projectRole is 'member'
    TestValidator.equals(
      "assignment projectRole is member",
      createdAssignment.projectRole,
      "member",
    );
    // Validate project reference matches the created project
    TestValidator.equals(
      "assignment project id matches",
      createdAssignment.project.id,
      project.id,
    );
    // Validate organizationMember reference matches the added member
    TestValidator.equals(
      "assignment organizationMember id matches",
      createdAssignment.organizationMember.id,
      orgMember.id,
    );
  }
}
