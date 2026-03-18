import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_task_create_assignment_outside_project_membership(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(actorConnection, {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#a1b2c3",
        status: "active",
        budget_hours: 40,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      },
    });
  typia.assert(project);
  const invalidEmployeeId = typia.random<string & tags.Format<"uuid">>();
  const uniqueTitle = `task-${RandomGenerator.alphabets(10)}`;
  const body = {
    title: uniqueTitle,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    status: "open",
    priority: "high",
    estimated_hours: 8,
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    hrm_time_tracking_employee_id: invalidEmployeeId,
    parent_id: null,
  } satisfies IHrmTimeTrackingTask.ICreate;
  await TestValidator.httpError(
    "rejects assignment to non-member employee",
    [400, 403, 404, 422],
    async () => {
      await generate_random_hrm_time_tracking_projects_tasks_create(
        actorConnection,
        {
          params: { projectId: project.id },
          body,
        },
      );
    },
  );
  await TestValidator.httpError(
    "repeated invalid non-member assignment remains rejected",
    [400, 403, 404, 422],
    async () => {
      await generate_random_hrm_time_tracking_projects_tasks_create(
        actorConnection,
        {
          params: { projectId: project.id },
          body,
        },
      );
    },
  );
}
