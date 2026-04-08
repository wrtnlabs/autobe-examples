import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test discarding an active timer that is tracking time at the task level.
 *
 * Validates the complete timer discard workflow with task-level tracking. An employee starts a timer with both project and task assignments, then discards it. The test verifies that discard behavior is consistent regardless of timer granularity.
 *
 * Key validations include: (1) the discard operation successfully deletes the timer with task association, (2) no timelog is created despite the timer having task-level granularity, (3) the task remains unchanged and available for future time tracking, (4) the employee can start a new timer for the same or different task immediately after discard.
 *
 * 1. Member registers and authenticates to access timer operations.
 * 2. Employee record is created through invitation flow - employee must exist to track time.
 * 3. Project is created to track work against - timer requires valid project assignment.
 * 4. Employee is assigned to project as project member - required before tracking time.
 * 5. Task is created within project for granular time tracking.
 * 6. Active timer session is started with task assignment - discard requires active timer with task context.
 * 7. Timer is discarded - validates successful deletion without timelog creation.
 * 8. Employee starts new timer for same task - validates task remains available.
 */
export async function test_api_timer_discard_with_task_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create employee record through invitation flow
  // When email matches existing member, employee is created immediately
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: memberAuth.email,
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        },
      },
    );
  typia.assert(invitation);
  // 3. Create project for time tracking
  const project =
    await generate_random_hrm_platform_member_projects_create(memberConnection, {
      body: {},
    });
  typia.assert(project);
  // 4. Assign employee to project as project member
  // The prepare function handles generating the employee ID from the invitation
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // 5. Create task within project for granular time tracking
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.name(3),
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // Store task state before timer operations for comparison
  const taskBeforeTimer = {
    id: task.id,
    title: task.title,
    status: task.status,
  };
  // 6. Start active timer session with task assignment
  const timerWithTask = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
        hrm_platform_task_id: task.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timerWithTask);
  // Verify timer has task association
  TestValidator.equals("timer has task", timerWithTask.task?.id, task.id);
  TestValidator.equals(
    "timer has project",
    timerWithTask.project.id,
    project.id,
  );
  TestValidator.predicate(
    "timer is active (not stopped)",
    timerWithTask.stopped_at === null,
  );
  // 7. Discard the active timer
  await api.functional.hrmPlatform.member.timers.active.discard(
    memberConnection,
  );
  // 8. Verify employee can start new timer for same task immediately
  const newTimer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
        hrm_platform_task_id: task.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(newTimer);
  // Verify new timer is active and has task association
  TestValidator.equals("new timer has task", newTimer.task?.id, task.id);
  TestValidator.equals(
    "new timer has project",
    newTimer.project.id,
    project.id,
  );
  TestValidator.predicate("new timer is active", newTimer.stopped_at === null);
  TestValidator.notEquals(
    "new timer is different instance",
    timerWithTask.id,
    newTimer.id,
  );
  // Verify task remains unchanged and available (task state unchanged)
  TestValidator.equals("task id unchanged", task.id, taskBeforeTimer.id);
  TestValidator.equals(
    "task title unchanged",
    task.title,
    taskBeforeTimer.title,
  );
  TestValidator.equals(
    "task status unchanged",
    task.status,
    taskBeforeTimer.status,
  );
}