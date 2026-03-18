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

export async function test_api_task_history_detail_matching_project_task_chain(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const projectStart: string = new Date().toISOString();
  const projectEnd: string = new Date(
    Date.now() + 1000 * 60 * 60 * 24,
  ).toISOString();
  const taskDueDate: string = new Date(
    Date.now() + 1000 * 60 * 60 * 48,
  ).toISOString();
  const project = await generate_random_hrm_time_tracking_projects_create(
    actorConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#a1b2c3",
        status: "active",
        budget_hours: 40,
        start_date: projectStart,
        end_date: projectEnd,
      } satisfies DeepPartial<IHrmTimeTrackingProject.ICreate>,
    },
  );
  typia.assert(project);
  const taskBody = {
    title: `task-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "open",
    priority: "high",
    estimated_hours: 8,
    due_date: taskDueDate,
    hrm_time_tracking_employee_id: null,
    parent_id: null,
  } satisfies DeepPartial<IHrmTimeTrackingTask.ICreate>;
  const task = await generate_random_hrm_time_tracking_projects_tasks_create(
    actorConnection,
    {
      params: {
        projectId: project.id,
      },
      body: taskBody,
    },
  );
  typia.assert(task);
  const historyBody = {
    new_status: "in-progress",
  } satisfies DeepPartial<IHrmTimeTrackingTaskHistory.ICreate>;
  const history =
    await generate_random_hrm_time_tracking_projects_tasks_histories_create(
      actorConnection,
      {
        params: {
          projectId: project.id,
          taskId: task.id,
        },
        body: historyBody,
      },
    );
  typia.assert(history);
  const found =
    await api.functional.hrmTimeTracking.projects.tasks.histories.at(
      actorConnection,
      {
        projectId: project.id,
        taskId: task.id,
        historyId: history.id,
      },
    );
  typia.assert(found);
  TestValidator.equals("history id matches", found.id, history.id);
  TestValidator.equals("joined task id matches", found.task.id, task.id);
  TestValidator.equals(
    "joined task title matches",
    found.task.title,
    task.title,
  );
  TestValidator.equals(
    "joined task description matches",
    found.task.description,
    task.description,
  );
  TestValidator.equals(
    "joined task status reflects new status",
    found.task.status,
    history.new_status,
  );
  TestValidator.equals(
    "joined task priority matches",
    found.task.priority,
    task.priority,
  );
  TestValidator.equals(
    "joined task estimated hours matches",
    found.task.estimated_hours,
    task.estimated_hours,
  );
  TestValidator.equals(
    "joined task due date matches",
    found.task.due_date,
    task.due_date,
  );
  TestValidator.equals(
    "joined task deleted_at matches",
    found.task.deleted_at,
    task.deleted_at,
  );
  TestValidator.equals(
    "actor type matches created history",
    found.actor_type,
    history.actor_type,
  );
  TestValidator.equals(
    "old status matches pre-transition task status",
    found.old_status,
    task.status,
  );
  TestValidator.equals(
    "new status matches submitted transition",
    found.new_status,
    historyBody.new_status,
  );
  TestValidator.equals(
    "changed_at matches persisted history",
    found.changed_at,
    history.changed_at,
  );
  TestValidator.equals(
    "created_at matches persisted history",
    found.created_at,
    history.created_at,
  );
  TestValidator.equals(
    "updated_at matches persisted history",
    found.updated_at,
    history.updated_at,
  );
  TestValidator.equals(
    "history deleted_at matches",
    found.deleted_at,
    history.deleted_at,
  );
  TestValidator.equals("task parent remains null", found.task.parent, null);
  TestValidator.equals("task assignee remains null", found.task.assignee, null);
}
