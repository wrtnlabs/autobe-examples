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
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
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
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_creation_permission_denied_for_regular_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A (project lead setup)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create organization as member A
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create role with project management permissions for member A
  const leadRole = await generate_random_erp_hrm_member_roles_create(
    memberAConnection,
    {
      body: {
        name: "Project Lead",
        permissions: [
          { permission: "project.manage" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      },
    },
  );
  typia.assert(leadRole);
  // 4. Create organization member for member A
  const memberAOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberAConnection,
      {
        body: {
          organizationId: organization.id,
          userId: memberA.id,
          roleId: leadRole.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(memberAOrgMember);
  // 5. Create project as member A
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // 6. Assign member A as project lead
  await generate_random_erp_hrm_member_projects_members_create(
    memberAConnection,
    {
      params: { projectId: project.id },
      body: {
        organizationMemberId: memberAOrgMember.id,
        role: "project-lead",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  // 7. Authenticate as member B (regular member)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 8. Create role for regular member
  const memberRole = await generate_random_erp_hrm_member_roles_create(
    memberAConnection,
    {
      body: {
        name: "Regular Member",
        permissions: [] satisfies IErpHrmRolePermission.ICreate[],
      },
    },
  );
  typia.assert(memberRole);
  // 9. Create organization member for member B
  const memberBOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberAConnection,
      {
        body: {
          organizationId: organization.id,
          userId: memberB.id,
          roleId: memberRole.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(memberBOrgMember);
  // 10. Assign member B as regular member on the project
  await generate_random_erp_hrm_member_projects_members_create(
    memberAConnection,
    {
      params: { projectId: project.id },
      body: {
        organizationMemberId: memberBOrgMember.id,
        role: "member",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  // 11. Test: Member B attempts to create task - should fail with unauthorized error
  await TestValidator.error("regular member cannot create tasks", async () => {
    await generate_random_erp_hrm_member_projects_tasks_create(
      memberBConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Test Task",
        } satisfies IErpHrmTask.ICreate,
      },
    );
  });
}
