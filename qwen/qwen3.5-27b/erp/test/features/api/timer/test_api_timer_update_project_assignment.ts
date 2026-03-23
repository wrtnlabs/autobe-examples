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
 * Test changing the project assignment of an active timer session.
 * 1. Admin authenticates
 * 2. Create two projects (source and target)
 * 3. Create tasks in both projects
 * 4. Start a timer assigned to the first project and task
 * 5. Update the timer to assign it to the second project and task
 * 6. Verify the timer is successfully reassigned with preserved started_at
 */
export async function test_api_timer_update_project_assignment(
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
  // 2. Create source project
  const sourceProject =
    await generate_random_hrm_platform_member_projects_create(adminConnection, {
      body: {
        name: "Source Project - Timer Test",
        description: "Source project for timer reassignment test",
        status: "active",
        color_code: "#FF5733",
      },
    });
  typia.assert(sourceProject);
  // 3. Create target project
  const targetProject =
    await generate_random_hrm_platform_member_projects_create(adminConnection, {
      body: {
        name: "Target Project - Timer Test",
        description: "Target project for timer reassignment test",
        status: "active",
        color_code: "#33FF57",
      },
    });
  typia.assert(targetProject);
  // 4. Create task in source project
  const sourceTask =
    await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        params: {
          projectId: sourceProject.id,
        },
        body: {
          title: "Source Task - Initial Timer Assignment",
          description: "Task for initial timer assignment",
          status: "open",
          priority: "medium",
        },
      },
    );
  typia.assert(sourceTask);
  // 5. Create task in target project
  const targetTask =
    await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        params: {
          projectId: targetProject.id,
        },
        body: {
          title: "Target Task - Reassigned Timer",
          description: "Task for reassigned timer",
          status: "open",
          priority: "high",
        },
      },
    );
  typia.assert(targetTask);
  // 6. Create timer assigned to source project and task
  const timer = await generate_random_hrm_platform_admin_timers_create(
    adminConnection,
    {
      body: {
        projectId: sourceProject.id,
        taskId: sourceTask.id,
        description: "Working on source project task",
      },
    },
  );
  typia.assert(timer);
  // Store original started_at timestamp
  const originalStartedAt = timer.started_at;
  // Verify initial timer state
  TestValidator.equals(
    "timer initially assigned to source project",
    timer.project.id,
    sourceProject.id,
  );
  TestValidator.equals(
    "timer initially assigned to source task",
    timer.task?.id,
    sourceTask.id,
  );
  TestValidator.predicate(
    "timer is active (stopped_at is null)",
    timer.stopped_at === null,
  );
  // 7. Update timer to assign to target project and task
  const updatedTimer = await api.functional.hrmPlatform.admin.timers.update(
    adminConnection,
    {
      timerId: timer.id,
      body: {
        project_id: targetProject.id,
        task_id: targetTask.id,
        description: "Working on target project task after reassignment",
      } satisfies IHrmPlatformTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 8. Verify timer reassignment
  TestValidator.equals(
    "timer reassigned to target project",
    updatedTimer.project.id,
    targetProject.id,
  );
  TestValidator.equals(
    "timer reassigned to target task",
    updatedTimer.task?.id,
    targetTask.id,
  );
  TestValidator.equals(
    "timer description updated",
    updatedTimer.description,
    "Working on target project task after reassignment",
  );
  TestValidator.equals(
    "started_at timestamp preserved",
    updatedTimer.started_at,
    originalStartedAt,
  );
  TestValidator.predicate(
    "timer remains active after update",
    updatedTimer.stopped_at === null,
  );
  TestValidator.predicate(
    "updated_at timestamp is newer than created_at",
    new Date(updatedTimer.updated_at).getTime() >=
      new Date(updatedTimer.created_at).getTime(),
  );
}
