import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test task assignment management on a running timer. Validates:
 * (1) Organization and project setup with member authentication,
 * (2) Project membership assignment for the employee,
 * (3) Multiple task creation within the project,
 * (4) Timer initialization at project level (task_id: null),
 * (5) Adding task assignment to running timer,
 * (6) Switching between different tasks,
 * (7) Removing task assignment (task_id: null).
 * Each update preserves started_at timestamp and running state,
 * validating task selection is optional and modifiable during active timing.
 */
export async function test_api_timer_update_task_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Create project membership
  // The prepare function resolves employee_id from authenticated context
  const membership =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          role: "member",
        },
      },
    );
  typia.assert(membership);
  // 5. Create first task
  const task1 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task1);
  // 6. Create second task
  const task2 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "high",
      },
    },
  );
  typia.assert(task2);
  // 7. Start timer on project without task (project-level tracking)
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: null,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(timer);
  TestValidator.equals("initial task is null", timer.task, null);
  const originalStartedAt = timer.started_at;
  // 8. Update timer to add first task
  const timerWithTask1 = await api.functional.hrmPlatform.member.timers.patch(
    memberConnection,
    {
      body: {
        task_id: task1.id,
      } satisfies IHrmPlatformTimer.IUpdate,
    },
  );
  typia.assert(timerWithTask1);
  TestValidator.equals("timer id preserved", timer.id, timerWithTask1.id);
  TestValidator.equals(
    "started_at preserved",
    timerWithTask1.started_at,
    originalStartedAt,
  );
  TestValidator.equals("task1 assigned", timerWithTask1.task!.id, task1.id);
  // 9. Update timer to switch to second task
  const timerWithTask2 = await api.functional.hrmPlatform.member.timers.patch(
    memberConnection,
    {
      body: {
        task_id: task2.id,
      } satisfies IHrmPlatformTimer.IUpdate,
    },
  );
  typia.assert(timerWithTask2);
  TestValidator.equals(
    "started_at preserved",
    timerWithTask2.started_at,
    originalStartedAt,
  );
  TestValidator.equals("task2 assigned", timerWithTask2.task!.id, task2.id);
  // 10. Update timer to remove task (back to project-level)
  const timerWithoutTask = await api.functional.hrmPlatform.member.timers.patch(
    memberConnection,
    {
      body: {
        task_id: null,
      } satisfies IHrmPlatformTimer.IUpdate,
    },
  );
  typia.assert(timerWithoutTask);
  TestValidator.equals(
    "started_at preserved",
    timerWithoutTask.started_at,
    originalStartedAt,
  );
  TestValidator.equals("task removed", timerWithoutTask.task, null);
}
