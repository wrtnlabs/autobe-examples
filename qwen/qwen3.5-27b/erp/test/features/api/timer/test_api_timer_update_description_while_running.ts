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

export async function test_api_timer_update_description_while_running(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test updating the description of an active timer session.
   * 1. Admin authenticates to the system
   * 2. Create a project for timer assignment
   * 3. Create a task within the project
   * 4. Start a timer with initial description
   * 5. Update only the description while timer is running
   * 6. Verify timer state preservation and description update
   */
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/login",
      referrer: "https://test.com",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {
      body: {
        name: "Timer Update Test Project",
        description: "Project for testing timer description updates",
        status: "active",
        color_code: "#3498db",
      },
    },
  );
  typia.assert(project);
  // 3. Create a task within the project
  const task = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: "Timer Description Update Task",
        description: "Task for timer testing",
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // 4. Start a timer with initial description
  const initialDescription = "Initial work description";
  const timer = await generate_random_hrm_platform_admin_timers_create(
    adminConnection,
    {
      body: {
        projectId: project.id,
        taskId: task.id,
        description: initialDescription,
      },
    },
  );
  typia.assert(timer);
  // Verify initial timer state
  TestValidator.equals(
    "initial description",
    timer.description,
    initialDescription,
  );
  TestValidator.equals("initial project", timer.project.id, project.id);
  TestValidator.equals("initial task", timer.task?.id, task.id);
  TestValidator.predicate("timer is running", timer.stopped_at === null);
  const startedAt = timer.started_at;
  const initialUpdatedAt = timer.updated_at;
  // 5. Update only the description
  const newDescription = "Updated work description after modification";
  const updatedTimer = await api.functional.hrmPlatform.admin.timers.update(
    adminConnection,
    {
      timerId: timer.id,
      body: {
        description: newDescription,
      } satisfies IHrmPlatformTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 6. Verify timer state preservation and description update
  TestValidator.equals(
    "description updated",
    updatedTimer.description,
    newDescription,
  );
  TestValidator.equals(
    "started_at unchanged",
    updatedTimer.started_at,
    startedAt,
  );
  TestValidator.equals("timer still running", updatedTimer.stopped_at, null);
  TestValidator.equals(
    "project preserved",
    updatedTimer.project.id,
    project.id,
  );
  TestValidator.equals("task preserved", updatedTimer.task?.id, task.id);
  TestValidator.predicate(
    "updated_at refreshed",
    updatedTimer.updated_at !== initialUpdatedAt,
  );
}
