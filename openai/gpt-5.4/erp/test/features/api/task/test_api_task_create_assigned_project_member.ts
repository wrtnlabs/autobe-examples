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

export async function test_api_task_create_assigned_project_member(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const projectBody = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({ paragraphs: 2 }),
    color_code: `#${RandomGenerator.alphaNumeric(6)}`,
    status: "active",
    budget_hours: 120,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  } satisfies IHrmTimeTrackingProject.ICreate;
  const project = await generate_random_hrm_time_tracking_projects_create(
    ownerConnection,
    {
      body: projectBody,
    },
  );
  typia.assert(project);
  const taskBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "open",
    priority: "high",
    estimated_hours: 8,
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    hrm_time_tracking_employee_id: null,
    parent_id: null,
  } satisfies IHrmTimeTrackingTask.ICreate;
  const task = await generate_random_hrm_time_tracking_projects_tasks_create(
    ownerConnection,
    {
      params: {
        projectId: project.id,
      },
      body: taskBody,
    },
  );
  typia.assert(task);
  TestValidator.equals("project id matches", task.project.id, project.id);
  TestValidator.equals("project name matches", task.project.name, project.name);
  TestValidator.equals(
    "project organization matches",
    task.project.organization.id,
    project.organization.id,
  );
  TestValidator.equals("task title matches", task.title, taskBody.title);
  TestValidator.equals(
    "task description matches",
    task.description,
    taskBody.description ?? null,
  );
  TestValidator.equals("task status matches", task.status, taskBody.status);
  TestValidator.equals(
    "task priority matches",
    task.priority,
    taskBody.priority,
  );
  TestValidator.equals(
    "task estimated hours match",
    task.estimated_hours,
    taskBody.estimated_hours ?? null,
  );
  TestValidator.equals(
    "task due date matches",
    task.due_date,
    taskBody.due_date ?? null,
  );
  TestValidator.equals("top level task has no parent", task.parent, null);
  TestValidator.equals(
    "unassigned task has null assignee",
    task.assignee,
    null,
  );
  TestValidator.equals("task is not deleted", task.deleted_at, null);
}
