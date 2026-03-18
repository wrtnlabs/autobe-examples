import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_create";
import { generate_random_hrm_time_tracking_projects_tasks_histories_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_histories_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";
import { prepare_random_hrm_time_tracking_task_history } from "../../../prepare/prepare_random_hrm_time_tracking_task_history";

export async function test_api_task_history_detail_rejects_mismatched_nested_path(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const projectA = await generate_random_hrm_time_tracking_projects_create(
    actorConnection,
    {
      body: {
        name: `project-a-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#1144aa",
        status: "active",
        budget_hours: 120,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      },
    },
  );
  typia.assert(projectA);
  const taskA = await generate_random_hrm_time_tracking_projects_tasks_create(
    actorConnection,
    {
      params: {
        projectId: projectA.id,
      },
      body: {
        title: `task-a-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 4 }),
        status: "open",
        priority: "high",
        estimated_hours: 8,
        due_date: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
        hrm_time_tracking_employee_id: null,
        parent_id: null,
      },
    },
  );
  typia.assert(taskA);
  const historyA =
    await generate_random_hrm_time_tracking_projects_tasks_histories_create(
      actorConnection,
      {
        params: {
          projectId: projectA.id,
          taskId: taskA.id,
        },
        body: {
          new_status: "in-progress",
        },
      },
    );
  typia.assert(historyA);
  const projectB = await generate_random_hrm_time_tracking_projects_create(
    actorConnection,
    {
      body: {
        name: `project-b-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#22aa55",
        status: "active",
        budget_hours: 80,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
      },
    },
  );
  typia.assert(projectB);
  const taskB = await generate_random_hrm_time_tracking_projects_tasks_create(
    actorConnection,
    {
      params: {
        projectId: projectB.id,
      },
      body: {
        title: `task-b-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 4 }),
        status: "open",
        priority: "medium",
        estimated_hours: 5,
        due_date: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
        hrm_time_tracking_employee_id: null,
        parent_id: null,
      },
    },
  );
  typia.assert(taskB);
  const validHistory =
    await api.functional.hrmTimeTracking.projects.tasks.histories.at(
      actorConnection,
      {
        projectId: projectA.id,
        taskId: taskA.id,
        historyId: historyA.id,
      },
    );
  typia.assert(validHistory);
  TestValidator.equals(
    "history id matches created history",
    validHistory.id,
    historyA.id,
  );
  TestValidator.equals(
    "history task matches original task",
    validHistory.task.id,
    taskA.id,
  );
  TestValidator.equals(
    "history old status preserved",
    validHistory.old_status,
    historyA.old_status,
  );
  TestValidator.equals(
    "history new status preserved",
    validHistory.new_status,
    historyA.new_status,
  );
  await TestValidator.error(
    "reject mismatched project and task chain",
    async () => {
      await api.functional.hrmTimeTracking.projects.tasks.histories.at(
        actorConnection,
        {
          projectId: projectB.id,
          taskId: taskB.id,
          historyId: historyA.id,
        },
      );
    },
  );
}
