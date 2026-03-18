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

export async function test_api_task_update_project_scoped_details(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const projectStartDate = new Date().toISOString() satisfies string as string &
    tags.Format<"date-time">;
  const projectEndDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 14,
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const projectBody = {
    name: `project-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    color_code: "#1a2b3c",
    status: "active",
    budget_hours: 120,
    start_date: projectStartDate,
    end_date: projectEndDate,
  } satisfies IHrmTimeTrackingProject.ICreate;
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(managerConnection, {
      body: projectBody,
    });
  typia.assert(project);
  const createdTaskBody = {
    title: `task-${RandomGenerator.alphabets(8)}`,
    description: null,
    status: "open",
    priority: "low",
    estimated_hours: null,
    due_date: null,
    hrm_time_tracking_employee_id: null,
    parent_id: null,
  } satisfies IHrmTimeTrackingTask.ICreate;
  const createdTask: IHrmTimeTrackingTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      managerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: createdTaskBody,
      },
    );
  typia.assert(createdTask);
  const updatedTitle: string = `updated-${RandomGenerator.alphabets(10)}`;
  const updatedDescription: string = RandomGenerator.content({ paragraphs: 2 });
  const updatedStatus: string = "in-progress";
  const updatedPriority: string = "high";
  const updatedEstimatedHours: number = 24;
  const updatedDueDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const updateBody = {
    hrm_time_tracking_employee_id: null,
    parent_id: null,
    title: updatedTitle,
    description: updatedDescription,
    status: updatedStatus,
    priority: updatedPriority,
    estimated_hours: updatedEstimatedHours,
    due_date: updatedDueDate,
  } satisfies IHrmTimeTrackingTask.IUpdate;
  TestValidator.notEquals(
    "title changes from original value",
    createdTask.title,
    updatedTitle,
  );
  TestValidator.notEquals(
    "description changes from original value",
    createdTask.description,
    updatedDescription,
  );
  TestValidator.notEquals(
    "status changes from original value",
    createdTask.status,
    updatedStatus,
  );
  TestValidator.notEquals(
    "priority changes from original value",
    createdTask.priority,
    updatedPriority,
  );
  TestValidator.notEquals(
    "estimated hours changes from original value",
    createdTask.estimated_hours,
    updatedEstimatedHours,
  );
  TestValidator.notEquals(
    "due date changes from original value",
    createdTask.due_date,
    updatedDueDate,
  );
  const updatedTask: IHrmTimeTrackingTask =
    await api.functional.hrmTimeTracking.projects.tasks.update(
      managerConnection,
      {
        projectId: project.id,
        taskId: createdTask.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTask);
  TestValidator.equals(
    "task identity remains the same",
    updatedTask.id,
    createdTask.id,
  );
  TestValidator.equals(
    "project id remains the same",
    updatedTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "project context remains the same organization",
    updatedTask.project.organization.id,
    project.organization.id,
  );
  TestValidator.equals(
    "project summary name matches owning project",
    updatedTask.project.name,
    project.name,
  );
  TestValidator.equals(
    "project summary description matches owning project",
    updatedTask.project.description,
    project.description,
  );
  TestValidator.equals(
    "project summary color code matches owning project",
    updatedTask.project.color_code,
    project.colorCode,
  );
  TestValidator.equals(
    "project summary status matches owning project",
    updatedTask.project.status,
    project.status,
  );
  TestValidator.equals(
    "project summary budget hours matches owning project",
    updatedTask.project.budget_hours,
    project.budgetHours,
  );
  TestValidator.equals(
    "project summary start date matches owning project",
    updatedTask.project.start_date,
    project.startDate,
  );
  TestValidator.equals(
    "project summary end date matches owning project",
    updatedTask.project.end_date,
    project.endDate,
  );
  TestValidator.equals(
    "updated title persisted",
    updatedTask.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated description persisted",
    updatedTask.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated status persisted",
    updatedTask.status,
    updatedStatus,
  );
  TestValidator.equals(
    "updated priority persisted",
    updatedTask.priority,
    updatedPriority,
  );
  TestValidator.equals(
    "updated estimated hours persisted",
    updatedTask.estimated_hours,
    updatedEstimatedHours,
  );
  TestValidator.equals(
    "updated due date persisted",
    updatedTask.due_date,
    updatedDueDate,
  );
  TestValidator.equals("assignee remains unset", updatedTask.assignee, null);
  TestValidator.equals("parent remains unset", updatedTask.parent, null);
  TestValidator.equals(
    "created timestamp remains unchanged",
    updatedTask.created_at,
    createdTask.created_at,
  );
  TestValidator.equals("task remains active", updatedTask.deleted_at, null);
  TestValidator.predicate(
    "updated timestamp is not earlier than created timestamp",
    new Date(updatedTask.updated_at).getTime() >=
      new Date(updatedTask.created_at).getTime(),
  );
}
