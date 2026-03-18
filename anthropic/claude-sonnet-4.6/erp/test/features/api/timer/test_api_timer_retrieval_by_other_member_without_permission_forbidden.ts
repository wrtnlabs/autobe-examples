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
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_retrieval_by_other_member_without_permission_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Member A (the timer owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // memberAConnection now has Authorization header set via authorize_member_join
  // Step 2: Create an organization under Member A
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a restricted role without `time:view_all` (only `project:view`)
  const restrictedRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberAConnection,
      {
        body: {
          name: `restricted-role-${RandomGenerator.alphabets(6)}`,
          permissions: ["project:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(restrictedRole);
  // Step 4: Register Member B (the unauthorized requester)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {});
  // memberBConnection now has Authorization header set via authorize_member_join
  // Step 5: Add Member B to the organization with the restricted role (using Member A's connection)
  const orgMemberB =
    await generate_random_erp_hrm_member_organizations_members_create(
      memberAConnection,
      {
        body: {
          memberId: memberBAuthorized.member.id,
          roleId: restrictedRole.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgMemberB);
  // Step 6: Create a project as Member A
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // Step 7: Add Member A as a project member (Member A's org member ID is organization.owner.id)
  const projectMemberA =
    await generate_random_erp_hrm_member_projects_members_create(
      memberAConnection,
      {
        body: {
          organizationMemberId: organization.owner.id,
          projectRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMemberA);
  // Step 8: Start a timer as Member A
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberAConnection,
    {
      body: {
        project_id: project.id,
      },
    },
  );
  typia.assert(timer);
  // Step 9: Attempt to retrieve Member A's timer as Member B → expect 403 Forbidden
  // Member B has no `time:view_all` permission, so cross-member timer access is denied
  await TestValidator.httpError(
    "member without time:view_all cannot retrieve another member's timer",
    403,
    async () => {
      await api.functional.erpHrm.member.timers.at(memberBConnection, {
        timerId: timer.id,
      });
    },
  );
}
