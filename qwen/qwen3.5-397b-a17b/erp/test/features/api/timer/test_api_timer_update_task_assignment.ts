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
 * Test task management operations on a running timer.
 *
 * This test covers three sub-cases:
 * 1. Adding a task to a timer that was started without task selection
 * 2. Changing the task on a timer (switching from Task A to Task B)
 * 3. Removing task from timer (setting task_id to null)
 */
export async function test_api_timer_update_task_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 4. Create two tasks within the project
  const task1 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.name(),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.name(),
        status: "open",
        priority: "high",
      },
    },
  );
  typia.assert(task2);
  // 5. Create timer without task assignment (project-level tracking)
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: null,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timer);
  TestValidator.equals("timer project matches", timer.project.id, project.id);
  TestValidator.equals("timer has no task initially", timer.task, null);
  // === SUB-CASE 1: Add task to timer (null -> task1) ===
  const timerWithTask1 =
    await api.functional.hrmPlatform.member.timers.putByTimerid(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          task_id: task1.id,
        },
      },
    );
  typia.assert(timerWithTask1);
  TestValidator.equals("task1 assigned", timerWithTask1.task?.id, task1.id);
  TestValidator.equals("timer still running", timerWithTask1.deleted_at, null);
  // === SUB-CASE 2: Change task on timer (task1 -> task2) ===
  const timerWithTask2 =
    await api.functional.hrmPlatform.member.timers.putByTimerid(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          task_id: task2.id,
        },
      },
    );
  typia.assert(timerWithTask2);
  TestValidator.equals("task2 assigned", timerWithTask2.task?.id, task2.id);
  TestValidator.notEquals(
    "task changed",
    timerWithTask1.task?.id,
    timerWithTask2.task?.id,
  );
  // === SUB-CASE 3: Remove task from timer (task2 -> null) ===
  const timerWithoutTask =
    await api.functional.hrmPlatform.member.timers.putByTimerid(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          task_id: null,
        },
      },
    );
  typia.assert(timerWithoutTask);
  TestValidator.equals("task removed", timerWithoutTask.task, null);
  TestValidator.equals(
    "timer project unchanged",
    timerWithoutTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "timer still running",
    timerWithoutTask.deleted_at,
    null,
  );
  // Validate timer continues running throughout all updates
  TestValidator.predicate(
    "timer started_at preserved",
    () =>
      timerWithTask1.started_at === timerWithTask2.started_at &&
      timerWithTask2.started_at === timerWithoutTask.started_at,
  );
}
