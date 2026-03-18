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

export async function test_api_task_update_without_management_authority(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const projectStartDate = new Date().toISOString();
  const projectEndDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const taskDueDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 3,
  ).toISOString();
  const updatedTaskDueDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 10,
  ).toISOString();
  const projectBody = {
    name: `project-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    color_code: "#3366cc",
    status: "active",
    budget_hours: 120,
    start_date: projectStartDate,
    end_date: projectEndDate,
  } satisfies IHrmTimeTrackingProject.ICreate;
  const project = await generate_random_hrm_time_tracking_projects_create(
    managerConnection,
    {
      body: projectBody,
    },
  );
  typia.assert(project);
  const taskBody = {
    title: `task-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    status: "open",
    priority: "medium",
    estimated_hours: 8,
    due_date: taskDueDate,
    hrm_time_tracking_employee_id: null,
    parent_id: null,
  } satisfies IHrmTimeTrackingTask.ICreate;
  const task = await generate_random_hrm_time_tracking_projects_tasks_create(
    managerConnection,
    {
      params: {
        projectId: project.id,
      },
      body: taskBody,
    },
  );
  typia.assert(task);
  const updateBody = {
    title: `updated-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    status: "in-progress",
    priority: "high",
    estimated_hours: 13,
    due_date: updatedTaskDueDate,
    hrm_time_tracking_employee_id: null,
    parent_id: null,
  } satisfies IHrmTimeTrackingTask.IUpdate;
  const updated = await api.functional.hrmTimeTracking.projects.tasks.update(
    managerConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "project id is preserved",
    updated.project.id,
    project.id,
  );
  TestValidator.equals("task id is preserved", updated.id, task.id);
  TestValidator.equals(
    "updated title matches request",
    updated.title,
    updateBody.title,
  );
  TestValidator.equals(
    "updated description matches request",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated status matches request",
    updated.status,
    updateBody.status,
  );
  TestValidator.equals(
    "updated priority matches request",
    updated.priority,
    updateBody.priority,
  );
  TestValidator.equals(
    "updated estimated hours matches request",
    updated.estimated_hours,
    updateBody.estimated_hours,
  );
  TestValidator.equals(
    "updated due date matches request",
    updated.due_date,
    updateBody.due_date,
  );
  TestValidator.equals("assignee remains unassigned", updated.assignee, null);
  TestValidator.equals("parent remains top-level", updated.parent, null);
  TestValidator.notEquals(
    "updated timestamp changes after update",
    updated.updated_at,
    task.updated_at,
  );
}
