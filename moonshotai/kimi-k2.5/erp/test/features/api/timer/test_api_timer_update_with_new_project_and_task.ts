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

export async function test_api_timer_update_with_new_project_and_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and establish session
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create organization for testing
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  // 3. Create role for organization member assignment
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {},
  );
  // 4. Create organization member for the authenticated user
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
  // 5. Create source project for initial timer
  const sourceProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  // 6. Create target project to switch timer to
  const targetProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  // 7. Add employee as member to source project
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    {
      body: {
        organizationMemberId: organizationMember.id,
        role: "member",
      },
      params: {
        projectId: sourceProject.id,
      },
    },
  );
  // 8. Add employee as member to target project
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    {
      body: {
        organizationMemberId: organizationMember.id,
        role: "member",
      },
      params: {
        projectId: targetProject.id,
      },
    },
  );
  // 9. Create task in the target project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: "Task for timer testing",
      },
      params: {
        projectId: targetProject.id,
      },
    },
  );
  // 10. Start a timer on the source project
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        projectId: sourceProject.id,
        description: "Initial work on source project",
      },
    },
  );
  typia.assert(timer);
  const originalStartedAt = timer.startedAt;
  const originalOrganizationMemberId = timer.organizationMember.id;
  // 11. Update the timer to switch to target project and associate with task
  const updatedTimer = await api.functional.erpHrm.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body: {
        projectId: targetProject.id,
        taskId: task.id,
        description: "Switched to target project with task",
      } satisfies IErpHrmTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 12. Validate: response returns updated timer with new project, task, and description
  TestValidator.equals(
    "timer project updated to target",
    updatedTimer.project.id,
    targetProject.id,
  );
  TestValidator.equals(
    "timer task updated to target task",
    updatedTimer.task!.id,
    task.id,
  );
  TestValidator.equals(
    "timer description updated",
    updatedTimer.description,
    "Switched to target project with task",
  );
  // Validate: immutable fields remain unchanged
  TestValidator.equals(
    "started_at remains unchanged",
    updatedTimer.startedAt,
    originalStartedAt,
  );
  TestValidator.equals(
    "organization_member remains unchanged",
    updatedTimer.organizationMember.id,
    originalOrganizationMemberId,
  );
  // Validate: elapsed duration continues calculating (should be non-negative)
  TestValidator.predicate(
    "elapsed duration continues calculating from original start time",
    updatedTimer.elapsedDuration >= 0,
  );
}
