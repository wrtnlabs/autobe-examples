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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTask";
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

export async function test_api_task_list_project_membership_scope(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Str0ngPassw0rd!123",
      href: "https://example.com/hrm/projects/tasks",
      referrer: "https://example.com/hrm",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const targetProject = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        name: `Project ${RandomGenerator.name(2)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#3366cc",
        status: "active",
        budget_hours: 120,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
      },
    },
  );
  typia.assert(targetProject);
  const targetMembership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      employeeConnection,
      {
        params: {
          projectId: targetProject.id,
        },
        body: {
          employee_id: authorized.id,
          membership_role: "member",
        },
      },
    );
  typia.assert(targetMembership);
  TestValidator.equals(
    "target membership employee id",
    targetMembership.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "target membership project id",
    targetMembership.project.id,
    targetProject.id,
  );
  const assignedParentTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      employeeConnection,
      {
        params: {
          projectId: targetProject.id,
        },
        body: {
          title: `Assigned parent ${RandomGenerator.paragraph({ sentences: 2 })}`,
          description: RandomGenerator.content({ paragraphs: 2 }),
          status: "open",
          priority: "high",
          estimated_hours: 8,
          due_date: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 3,
          ).toISOString(),
          hrm_time_tracking_employee_id: authorized.id,
          parent_id: null,
        },
      },
    );
  typia.assert(assignedParentTask);
  const unassignedTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      employeeConnection,
      {
        params: {
          projectId: targetProject.id,
        },
        body: {
          title: `Unassigned ${RandomGenerator.paragraph({ sentences: 2 })}`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          status: "in-progress",
          priority: "medium",
          estimated_hours: 5,
          due_date: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 5,
          ).toISOString(),
          hrm_time_tracking_employee_id: null,
          parent_id: null,
        },
      },
    );
  typia.assert(unassignedTask);
  const childTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      employeeConnection,
      {
        params: {
          projectId: targetProject.id,
        },
        body: {
          title: `Child ${RandomGenerator.paragraph({ sentences: 2 })}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "completed",
          priority: "low",
          estimated_hours: 2,
          due_date: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 7,
          ).toISOString(),
          hrm_time_tracking_employee_id: authorized.id,
          parent_id: assignedParentTask.id,
        },
      },
    );
  typia.assert(childTask);
  const otherProject = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        name: `Other ${RandomGenerator.name(2)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#cc6633",
        status: "active",
        budget_hours: 64,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString(),
      },
    },
  );
  typia.assert(otherProject);
  const otherMembership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      employeeConnection,
      {
        params: {
          projectId: otherProject.id,
        },
        body: {
          employee_id: authorized.id,
          membership_role: "member",
        },
      },
    );
  typia.assert(otherMembership);
  const otherProjectTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      employeeConnection,
      {
        params: {
          projectId: otherProject.id,
        },
        body: {
          title: `Other project ${RandomGenerator.paragraph({ sentences: 2 })}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "closed",
          priority: "urgent",
          estimated_hours: 13,
          due_date: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 10,
          ).toISOString(),
          hrm_time_tracking_employee_id: authorized.id,
          parent_id: null,
        },
      },
    );
  typia.assert(otherProjectTask);
  const requestBody = {
    sort: "created_at",
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingTask.IRequest;
  const page = await api.functional.hrmTimeTracking.projects.tasks.index(
    employeeConnection,
    {
      projectId: targetProject.id,
      body: requestBody,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page",
    page.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination limit",
    page.pagination.limit,
    requestBody.limit,
  );
  TestValidator.predicate(
    "pagination records cover created target tasks",
    page.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length within limit",
    page.data.length <= requestBody.limit,
  );
  const expectedTaskIds = [
    assignedParentTask.id,
    unassignedTask.id,
    childTask.id,
  ];
  const expectedTitles = [
    assignedParentTask.title,
    unassignedTask.title,
    childTask.title,
  ];
  TestValidator.predicate(
    "contains assigned parent task",
    ArrayUtil.has(page.data, (task) => task.id === assignedParentTask.id),
  );
  TestValidator.predicate(
    "contains unassigned task",
    ArrayUtil.has(page.data, (task) => task.id === unassignedTask.id),
  );
  TestValidator.predicate(
    "contains child task",
    ArrayUtil.has(page.data, (task) => task.id === childTask.id),
  );
  TestValidator.predicate(
    "does not contain other project task",
    ArrayUtil.has(page.data, (task) => task.id === otherProjectTask.id) ===
      false,
  );
  for (const task of page.data) {
    TestValidator.predicate(
      "task id belongs to requested project fixture set",
      expectedTaskIds.includes(task.id),
    );
    TestValidator.predicate(
      "task title belongs to requested project fixture set",
      expectedTitles.includes(task.title),
    );
    TestValidator.equals("task is active", task.deleted_at, null);
  }
  const listedAssignedParent = page.data.find(
    (task) => task.id === assignedParentTask.id,
  );
  const listedUnassigned = page.data.find(
    (task) => task.id === unassignedTask.id,
  );
  const listedChild = page.data.find((task) => task.id === childTask.id);
  TestValidator.predicate(
    "listed assigned parent exists",
    listedAssignedParent !== undefined,
  );
  TestValidator.predicate(
    "listed unassigned exists",
    listedUnassigned !== undefined,
  );
  TestValidator.predicate("listed child exists", listedChild !== undefined);
  if (
    listedAssignedParent !== undefined &&
    listedUnassigned !== undefined &&
    listedChild !== undefined
  ) {
    TestValidator.equals(
      "assigned parent title matches",
      listedAssignedParent.title,
      assignedParentTask.title,
    );
    TestValidator.equals(
      "assigned parent status matches",
      listedAssignedParent.status,
      assignedParentTask.status,
    );
    TestValidator.equals(
      "assigned parent priority matches",
      listedAssignedParent.priority,
      assignedParentTask.priority,
    );
    TestValidator.equals(
      "assigned parent estimated hours match",
      listedAssignedParent.estimated_hours,
      assignedParentTask.estimated_hours,
    );
    TestValidator.equals(
      "assigned parent due date matches",
      listedAssignedParent.due_date,
      assignedParentTask.due_date,
    );
    TestValidator.equals(
      "assigned parent assignee id matches",
      listedAssignedParent.assignee?.id,
      authorized.id,
    );
    TestValidator.equals(
      "assigned parent has no parent",
      listedAssignedParent.parent,
      null,
    );
    TestValidator.equals(
      "unassigned task title matches",
      listedUnassigned.title,
      unassignedTask.title,
    );
    TestValidator.equals(
      "unassigned task status matches",
      listedUnassigned.status,
      unassignedTask.status,
    );
    TestValidator.equals(
      "unassigned task priority matches",
      listedUnassigned.priority,
      unassignedTask.priority,
    );
    TestValidator.equals(
      "unassigned task estimated hours match",
      listedUnassigned.estimated_hours,
      unassignedTask.estimated_hours,
    );
    TestValidator.equals(
      "unassigned task due date matches",
      listedUnassigned.due_date,
      unassignedTask.due_date,
    );
    TestValidator.equals(
      "unassigned task assignee is null",
      listedUnassigned.assignee,
      null,
    );
    TestValidator.equals(
      "unassigned task parent is null",
      listedUnassigned.parent,
      null,
    );
    TestValidator.equals(
      "child title matches",
      listedChild.title,
      childTask.title,
    );
    TestValidator.equals(
      "child status matches",
      listedChild.status,
      childTask.status,
    );
    TestValidator.equals(
      "child priority matches",
      listedChild.priority,
      childTask.priority,
    );
    TestValidator.equals(
      "child estimated hours match",
      listedChild.estimated_hours,
      childTask.estimated_hours,
    );
    TestValidator.equals(
      "child due date matches",
      listedChild.due_date,
      childTask.due_date,
    );
    TestValidator.equals(
      "child assignee id matches",
      listedChild.assignee?.id,
      authorized.id,
    );
    TestValidator.equals(
      "child parent id matches",
      listedChild.parent?.id,
      assignedParentTask.id,
    );
  }
}
