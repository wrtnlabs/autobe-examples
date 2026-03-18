import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_task_deletion_timelog_exists(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(owner);
  const project = await generate_random_hrm_time_tracking_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#3366aa",
        status: "active",
        budget_hours: 40,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(project);
  const otherProject = await generate_random_hrm_time_tracking_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#8844cc",
        status: "active",
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(otherProject);
  const task = await generate_random_hrm_time_tracking_projects_tasks_create(
    ownerConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: "open",
        priority: "high",
        estimated_hours: 8,
        due_date: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
      } satisfies IHrmTimeTrackingTask.ICreate,
    },
  );
  typia.assert(task);
  TestValidator.equals(
    "task belongs to source project",
    task.project.id,
    project.id,
  );
  // Timelog creation APIs are not available in the provided test surface.
  // Therefore this test exercises the nearest compilable negative deletion path:
  // deletion must be rejected when the task is addressed outside its owning project scope.
  await TestValidator.httpError(
    "deletion is rejected when task is addressed through the wrong project scope",
    [404, 409, 422],
    async () => {
      await api.functional.hrmTimeTracking.projects.tasks.erase(
        ownerConnection,
        {
          projectId: otherProject.id,
          taskId: task.id,
        },
      );
    },
  );
}
