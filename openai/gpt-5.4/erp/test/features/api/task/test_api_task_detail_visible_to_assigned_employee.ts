import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_memberships_create } from "../../../generate/generate_random_hrm_time_tracking_projects_memberships_create";
import { generate_random_hrm_time_tracking_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_hrm_time_tracking_project_membership";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_task_detail_visible_to_assigned_employee(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(authorized);
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  const project = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: `#${RandomGenerator.alphabets(6)}`,
        status: "active",
        budget_hours: 40,
        start_date: startDate,
        end_date: endDate,
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(project);
  const membership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      employeeConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: authorized.id,
          membership_role: "member",
        } satisfies IHrmTimeTrackingProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  const taskBody = {
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "open",
    priority: "high",
    estimated_hours: 8,
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    hrm_time_tracking_employee_id: null,
    parent_id: null,
  } satisfies IHrmTimeTrackingTask.ICreate;
  const createdTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      employeeConnection,
      {
        params: {
          projectId: project.id,
        },
        body: taskBody,
      },
    );
  typia.assert(createdTask);
  const found = await api.functional.hrmTimeTracking.projects.tasks.at(
    employeeConnection,
    {
      projectId: project.id,
      taskId: createdTask.id,
    },
  );
  typia.assert(found);
  TestValidator.equals(
    "membership employee matches authorized employee",
    membership.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "membership project matches created project",
    membership.project.id,
    project.id,
  );
  TestValidator.equals(
    "task id matches created task",
    found.id,
    createdTask.id,
  );
  TestValidator.equals(
    "task title matches current state",
    found.title,
    createdTask.title,
  );
  TestValidator.equals(
    "task description matches current state",
    found.description,
    createdTask.description,
  );
  TestValidator.equals(
    "task status matches current state",
    found.status,
    createdTask.status,
  );
  TestValidator.equals(
    "task priority matches current state",
    found.priority,
    createdTask.priority,
  );
  TestValidator.equals(
    "task estimated hours match current state",
    found.estimated_hours,
    createdTask.estimated_hours,
  );
  TestValidator.equals(
    "task due date matches current state",
    found.due_date,
    createdTask.due_date,
  );
  TestValidator.equals(
    "task created_at unchanged by read",
    found.created_at,
    createdTask.created_at,
  );
  TestValidator.equals(
    "task updated_at unchanged by read",
    found.updated_at,
    createdTask.updated_at,
  );
  TestValidator.equals(
    "embedded project id matches",
    found.project.id,
    project.id,
  );
  TestValidator.equals(
    "embedded project name matches",
    found.project.name,
    project.name,
  );
  TestValidator.equals(
    "embedded project description matches",
    found.project.description,
    project.description,
  );
  TestValidator.equals(
    "embedded project color matches",
    found.project.color_code,
    project.colorCode,
  );
  TestValidator.equals(
    "embedded project status matches",
    found.project.status,
    project.status,
  );
  TestValidator.equals(
    "embedded project organization matches project",
    found.project.organization.id,
    project.organization.id,
  );
  TestValidator.equals(
    "embedded project organization matches employee organization context",
    found.project.organization.id,
    authorized.role.organization.id,
  );
  TestValidator.equals(
    "assignee is null when task created unassigned",
    found.assignee,
    null,
  );
  TestValidator.equals(
    "parent is null when task created as top-level",
    found.parent,
    null,
  );
  TestValidator.equals(
    "created task assignee remains null after read",
    createdTask.assignee,
    found.assignee,
  );
  TestValidator.equals(
    "created task parent remains null after read",
    createdTask.parent,
    found.parent,
  );
}
