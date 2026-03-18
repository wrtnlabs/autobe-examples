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

export async function test_api_task_history_detail_employee_unassigned_project_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = {
    host: connection.host,
  };
  const outsiderConnection: api.IConnection = {
    host: connection.host,
  };
  const projectBody = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    color_code: "#a1b2c3",
    status: "active",
    budget_hours: 40,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  } satisfies IHrmTimeTrackingProject.ICreate;
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(ownerConnection, {
      body: projectBody,
    });
  typia.assert(project);
  const taskBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "open",
    priority: "high",
    estimated_hours: 8,
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    hrm_time_tracking_employee_id: null,
    parent_id: null,
  } satisfies IHrmTimeTrackingTask.ICreate;
  const task: IHrmTimeTrackingTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      ownerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: taskBody,
      },
    );
  typia.assert(task);
  TestValidator.equals("task belongs to project", task.project.id, project.id);
  const historyBody = {
    new_status: "in-progress",
  } satisfies IHrmTimeTrackingTaskHistory.ICreate;
  const history: IHrmTimeTrackingTaskHistory =
    await generate_random_hrm_time_tracking_projects_tasks_histories_create(
      ownerConnection,
      {
        params: {
          projectId: project.id,
          taskId: task.id,
        },
        body: historyBody,
      },
    );
  typia.assert(history);
  TestValidator.equals("history belongs to task", history.task.id, task.id);
  TestValidator.equals(
    "history old status matches task status",
    history.old_status,
    task.status,
  );
  TestValidator.equals(
    "history new status matches request",
    history.new_status,
    historyBody.new_status,
  );
  await TestValidator.httpError(
    "unassigned project employee cannot read task history detail",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.projects.tasks.histories.at(
        outsiderConnection,
        {
          projectId: project.id,
          taskId: task.id,
          historyId: history.id,
        },
      );
    },
  );
}
