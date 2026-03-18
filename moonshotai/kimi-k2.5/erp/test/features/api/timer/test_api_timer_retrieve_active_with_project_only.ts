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
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_retrieve_active_with_project_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (create base connection)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom role
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {},
  );
  typia.assert(role);
  // 4. Create organization member (employee)
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
          userId: member.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  typia.assert(organizationMember);
  // 5. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 6. Assign employee as project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: {
          organizationMemberId: organizationMember.id,
          role: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 7. Start active timer with project only (no task)
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        taskId: null,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timer);
  // 8. Retrieve active timer
  const activeTimer =
    await api.functional.erpHrm.member.timer.at(memberConnection);
  typia.assert(activeTimer);
  // Verification points per scenario:
  // 1) Response includes timer with project reference, null task
  TestValidator.predicate(
    "timer has id",
    () => activeTimer.id !== null && activeTimer.id !== undefined,
  );
  TestValidator.predicate(
    "timer has organizationMember",
    () => activeTimer.organizationMember !== null,
  );
  TestValidator.predicate(
    "timer has project reference",
    () => activeTimer.project !== null,
  );
  TestValidator.equals(
    "task is null (no task selected)",
    activeTimer.task,
    null,
  );
  TestValidator.predicate(
    "elapsedDuration is calculated",
    () => activeTimer.elapsedDuration >= 0,
  );
  // 2) Project reference contains summary fields
  TestValidator.predicate(
    "project has id",
    () =>
      activeTimer.project.id !== null && activeTimer.project.id !== undefined,
  );
  TestValidator.predicate(
    "project has name",
    () =>
      activeTimer.project.name !== null &&
      activeTimer.project.name !== undefined,
  );
  TestValidator.equals(
    "project matches created project",
    activeTimer.project.id,
    project.id,
  );
  // 3) OrganizationMember reference contains employee summary
  TestValidator.predicate(
    "organizationMember has id",
    () =>
      activeTimer.organizationMember.id !== null &&
      activeTimer.organizationMember.id !== undefined,
  );
  TestValidator.predicate(
    "organizationMember has user",
    () => activeTimer.organizationMember.user !== null,
  );
  TestValidator.equals(
    "organizationMember matches",
    activeTimer.organizationMember.id,
    organizationMember.id,
  );
  // 4) Validate timestamps exist
  TestValidator.predicate(
    "startedAt exists",
    () => activeTimer.startedAt !== null && activeTimer.startedAt !== undefined,
  );
  TestValidator.predicate(
    "createdAt exists",
    () => activeTimer.createdAt !== null && activeTimer.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt exists",
    () => activeTimer.updatedAt !== null && activeTimer.updatedAt !== undefined,
  );
}
