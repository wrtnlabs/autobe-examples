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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_update_project_clears_task_automatically(
  connection: api.IConnection,
): Promise<void> {
  // ── Step 1: Register a new member ──────────────────────────────────────────
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // memberConnection.headers is now set with the JWT token
  // ── Step 2: Create an organization ─────────────────────────────────────────
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // The member who created the organization is automatically the owner with
  // the Owner role and is already an org member. We need to get the org member
  // record's ID to use for project member assignment. The organization.owner
  // gives us IErpHrmOrganizationMember.ISummary with the owner's orgMember id.
  const ownerOrgMemberId = organization.owner.id;
  // ── Step 3: Create a custom role with project:manage permission ─────────────
  // NOTE: The creating member is already the owner (with org:manage), so they
  // can already create projects. We still create the custom role as per the
  // scenario plan, but we will use the owner's existing permissions.
  // Actually since the owner already has full permissions, we can skip creating
  // a separate role for our test user. The owner can do everything directly.
  // ── Step 4: Create Project A ────────────────────────────────────────────────
  const projectA = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(projectA);
  // ── Step 5: Assign the member (owner) to Project A ──────────────────────────
  const projectAMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: {
          organizationMemberId: ownerOrgMemberId,
          projectRole: "project-lead",
        },
        params: {
          projectId: projectA.id,
        },
      },
    );
  typia.assert(projectAMember);
  // ── Step 6: Create Task A in Project A ─────────────────────────────────────
  const taskA = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      },
      params: {
        projectId: projectA.id,
      },
    },
  );
  typia.assert(taskA);
  // ── Step 7: Create Project B ────────────────────────────────────────────────
  const projectB = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(projectB);
  // ── Step 8: Assign the member (owner) to Project B ──────────────────────────
  const projectBMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: {
          organizationMemberId: ownerOrgMemberId,
          projectRole: "project-lead",
        },
        params: {
          projectId: projectB.id,
        },
      },
    );
  typia.assert(projectBMember);
  // ── Step 9: Start a timer against Project A + Task A ───────────────────────
  const timerDescription = RandomGenerator.paragraph({ sentences: 2 });
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: projectA.id,
        task_id: taskA.id,
        description: timerDescription,
      },
    },
  );
  typia.assert(timer);
  // Verify the timer was created with the task set
  TestValidator.equals(
    "timer project matches project A",
    timer.project.id,
    projectA.id,
  );
  TestValidator.predicate("timer task is set initially", timer.task !== null);
  TestValidator.equals("timer task matches task A", timer.task!.id, taskA.id);
  const timerStartedAt = timer.started_at;
  // ── Main Test: Switch project to B without providing a task ────────────────
  // Business rule: task from project A should be auto-cleared when project changes
  const updatedTimer = await api.functional.erpHrm.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body: {
        projectId: projectB.id,
      } satisfies IErpHrmTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // Verify the project was updated to B
  TestValidator.equals(
    "updated timer project is project B",
    updatedTimer.project.id,
    projectB.id,
  );
  // Verify the task was automatically cleared (null) because it belongs to project A, not B
  TestValidator.equals(
    "task is auto-cleared after project switch",
    updatedTimer.task,
    null,
  );
  // Verify started_at is unchanged (timer is still running)
  TestValidator.equals(
    "started_at is unchanged",
    updatedTimer.started_at,
    timerStartedAt,
  );
  // Verify description is unchanged
  TestValidator.equals(
    "description is unchanged",
    updatedTimer.description,
    timerDescription,
  );
  // ── Edge Case: Switch project AND provide a valid task from the new project ─
  // Create Task B in Project B
  const taskB = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      },
      params: {
        projectId: projectB.id,
      },
    },
  );
  typia.assert(taskB);
  // Update timer with both projectId=B and taskId=taskB (task from the new project)
  const updatedTimerWithTask = await api.functional.erpHrm.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body: {
        projectId: projectB.id,
        taskId: taskB.id,
      } satisfies IErpHrmTimer.IUpdate,
    },
  );
  typia.assert(updatedTimerWithTask);
  // Verify the project is still B
  TestValidator.equals(
    "edge case: project is still B",
    updatedTimerWithTask.project.id,
    projectB.id,
  );
  // Verify the task is set to taskB (not cleared), because we provided a task from the new project
  TestValidator.predicate(
    "edge case: task is not cleared",
    updatedTimerWithTask.task !== null,
  );
  TestValidator.equals(
    "edge case: task is set to taskB",
    updatedTimerWithTask.task!.id,
    taskB.id,
  );
}
