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
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

/**
 * Test updating only the description of an active timer without changing project or task.
 * This validates the common business workflow where an employee wants to add or correct
 * documentation about the work being performed while continuing to track time against
 * the same project and task.
 */
export async function test_api_timer_update_description_only(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create role
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {},
  );
  typia.assert(role);
  // 4. Create organization member (for the authenticated user)
  const orgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
          userId: authorized.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  typia.assert(orgMember);
  // 5. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 6. Assign employee to project
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: orgMember.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 7. Create task in project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(task);
  // 8. Create timer with initial description
  const initialDescription = RandomGenerator.content({ paragraphs: 1 });
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        taskId: task.id,
        description: initialDescription,
      },
    },
  );
  typia.assert(timer);
  // Record original values for comparison
  const originalProjectId = timer.project.id;
  const originalTaskId = timer.task?.id ?? null;
  const originalStartedAt = timer.startedAt;
  const originalElapsedDuration = timer.elapsedDuration;
  // 9. Update timer with new description while keeping projectId and taskId unchanged
  const newDescription = RandomGenerator.content({ paragraphs: 2 });
  const updated = await api.functional.erpHrm.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body: {
        description: newDescription,
      } satisfies IErpHrmTimer.IUpdate,
    },
  );
  typia.assert(updated);
  // Validate: response reflects updated description
  TestValidator.equals(
    "description updated",
    updated.description,
    newDescription,
  );
  TestValidator.notEquals(
    "description different from initial",
    updated.description,
    initialDescription,
  );
  // Validate: project and task associations remain unchanged
  TestValidator.equals(
    "project unchanged",
    updated.project.id,
    originalProjectId,
  );
  TestValidator.equals(
    "task unchanged",
    updated.task?.id ?? null,
    originalTaskId,
  );
  // Validate: elapsed duration continues from original start time
  TestValidator.equals(
    "started_at unchanged",
    updated.startedAt,
    originalStartedAt,
  );
  TestValidator.predicate(
    "elapsed duration is valid",
    updated.elapsedDuration >= originalElapsedDuration,
  );
  // Validate: updated_at is different (was modified)
  TestValidator.predicate(
    "updated_at after created_at or timer was updated",
    new Date(updated.updatedAt) >= new Date(timer.createdAt),
  );
}
