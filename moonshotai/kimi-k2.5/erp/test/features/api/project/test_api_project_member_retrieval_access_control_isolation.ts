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

export async function test_api_project_member_retrieval_access_control_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A (project creator)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create role for organization members
  const role = await generate_random_erp_hrm_member_roles_create(
    memberAConnection,
    {},
  );
  typia.assert(role);
  // 4. Authenticate as member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 5. Create organization member B (add member B to the organization)
  const organizationMemberB =
    await generate_random_erp_hrm_member_organization_members_create(
      memberAConnection,
      {
        body: {
          organizationId: organization.id,
          userId: memberB.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(organizationMemberB);
  // 6. Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // 7. Assign organization member B to the project, creating the project member record
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberAConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: organizationMemberB.id,
          role: "member",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 8. Authenticate as member C (non-member of the project)
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {});
  // 9. Attempt to retrieve the project member record using member C's credentials
  // Validation: The request from member C (who is not a project member) should return 403 Forbidden
  await TestValidator.httpError(
    "non-member access should be forbidden",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.members.at(
        memberCConnection,
        {
          projectId: project.id,
          projectMemberId: projectMember.id,
        },
      );
    },
  );
}
