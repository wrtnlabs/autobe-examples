import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_admin_projects_tasks_create";
import { generate_random_hrm_platform_admin_timers_create } from "../../../generate/generate_random_hrm_platform_admin_timers_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test changing the task assignment of an active timer session within the same project.
 * 1. Admin authenticates
 * 2. Creates a project with multiple tasks
 * 3. Starts a timer assigned to the project and first task
 * 4. Updates the timer to reassign it to a different task within the same project
 * 5. Validates that the timer is successfully reassigned while preserving project context and timer state
 */
export async function test_api_timer_update_task_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {
      body: {
        name: "Test Project for Timer Task Assignment",
        description:
          "Project used to test timer task reassignment functionality",
        status: "active",
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 3. Create first task for initial timer assignment
  const firstTask =
    await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: "First Task - Initial Assignment",
          description: "This task will be initially assigned to the timer",
          status: "in-progress",
          priority: "high",
        },
      },
    );
  typia.assert(firstTask);
  // 4. Create second task for timer reassignment
  const secondTask =
    await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: "Second Task - Reassignment Target",
          description: "This task will be the target for timer reassignment",
          status: "in-progress",
          priority: "medium",
        },
      },
    );
  typia.assert(secondTask);
  // 5. Create an active timer assigned to the first task
  const timer = await generate_random_hrm_platform_admin_timers_create(
    adminConnection,
    {
      body: {
        projectId: project.id,
        taskId: firstTask.id,
        description: "Working on first task initially",
      },
    },
  );
  typia.assert(timer);
  // Validate initial timer state
  TestValidator.equals(
    "timer initially assigned to first task",
    timer.task?.id,
    firstTask.id,
  );
  TestValidator.equals(
    "timer project matches created project",
    timer.project.id,
    project.id,
  );
  TestValidator.predicate(
    "timer is active (stopped_at is null)",
    timer.stopped_at === null,
  );
  const initialStartedAt = timer.started_at;
  // 6. Update the timer to reassign to the second task
  const updatedTimer = await api.functional.hrmPlatform.admin.timers.update(
    adminConnection,
    {
      timerId: timer.id,
      body: {
        task_id: secondTask.id,
        description: "Switched to working on second task",
      } satisfies IHrmPlatformTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 7. Validate timer reassignment
  TestValidator.equals(
    "timer reassigned to second task",
    updatedTimer.task?.id,
    secondTask.id,
  );
  TestValidator.equals(
    "new task belongs to same project",
    updatedTimer.task?.project.id,
    project.id,
  );
  TestValidator.equals(
    "project assignment remains unchanged",
    updatedTimer.project.id,
    project.id,
  );
  TestValidator.equals(
    "started_at timestamp is preserved",
    updatedTimer.started_at,
    initialStartedAt,
  );
  TestValidator.predicate(
    "timer remains active (stopped_at is null)",
    updatedTimer.stopped_at === null,
  );
  TestValidator.equals(
    "task_id updated to new task",
    updatedTimer.task?.id,
    secondTask.id,
  );
  TestValidator.equals(
    "description updated",
    updatedTimer.description,
    "Switched to working on second task",
  );
}
