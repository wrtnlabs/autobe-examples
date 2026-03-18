import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

export async function test_api_timer_update_project_and_task_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member employee
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create first project for initial timer assignment
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project1);
  // 3. Create second project for timer reassignment
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#33FF57",
      },
    },
  );
  typia.assert(project2);
  // 4. Create a task in the second project to link to timer
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project2.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // 5. Start a running timer on the first project without a task
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project1.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(timer);
  // Verify initial timer state
  TestValidator.equals(
    "timer project matches project1",
    timer.project.id,
    project1.id,
  );
  TestValidator.predicate(
    "timer has no task initially",
    timer.task === null || timer.task === undefined,
  );
  // 6. Update the timer to switch to the second project and link the task
  const updatedTimer = await api.functional.hrmPlatform.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body: {
        project_id: project2.id,
        task_id: task.id,
        description: "Updated work description",
      } satisfies IHrmPlatformTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 7. Verify the response contains the new project_id and task_id
  TestValidator.equals(
    "updated timer project matches project2",
    updatedTimer.project.id,
    project2.id,
  );
  TestValidator.predicate(
    "updated timer has task",
    updatedTimer.task !== null && updatedTimer.task !== undefined,
  );
  if (updatedTimer.task !== null && updatedTimer.task !== undefined) {
    TestValidator.equals("task id matches", updatedTimer.task.id, task.id);
  }
  // 8. Verify the updated_at timestamp reflects the change
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedTimer.updated_at).getTime() >=
      new Date(updatedTimer.created_at).getTime(),
  );
  // Verify description was updated
  TestValidator.equals(
    "description updated",
    updatedTimer.description,
    "Updated work description",
  );
}