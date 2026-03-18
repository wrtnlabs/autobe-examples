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

export async function test_api_task_list_filtered_sorted_paginated_scope(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!" satisfies string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(employee);
  const targetProject = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        name: `Target Project ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#3366FF",
        status: "active",
        budget_hours: 120,
        start_date: typia.random<string & tags.Format<"date-time">>(),
        end_date: typia.random<string & tags.Format<"date-time">>(),
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(targetProject);
  const extraProject = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        name: `Extra Project ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF6633",
        status: "active",
        budget_hours: 40,
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(extraProject);
  const membership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      employeeConnection,
      {
        params: {
          projectId: targetProject.id,
        },
        body: {
          employee_id: employee.id,
          membership_role: "member",
        } satisfies IHrmTimeTrackingProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  const matchingBodies = [
    {
      title: `match-a-${RandomGenerator.alphabets(5)}`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      status: "open",
      priority: "high",
      estimated_hours: 3,
      due_date: "2026-04-01T09:00:00.000Z",
      hrm_time_tracking_employee_id: employee.id,
      parent_id: null,
    },
    {
      title: `match-b-${RandomGenerator.alphabets(5)}`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      status: "open",
      priority: "high",
      estimated_hours: 5,
      due_date: "2026-04-03T09:00:00.000Z",
      hrm_time_tracking_employee_id: employee.id,
      parent_id: null,
    },
    {
      title: `match-c-${RandomGenerator.alphabets(5)}`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      status: "open",
      priority: "high",
      estimated_hours: 8,
      due_date: "2026-04-05T09:00:00.000Z",
      hrm_time_tracking_employee_id: employee.id,
      parent_id: null,
    },
  ] satisfies IHrmTimeTrackingTask.ICreate[];
  const targetMatchingTasks = await ArrayUtil.asyncMap(
    matchingBodies,
    async (body) => {
      const task =
        await generate_random_hrm_time_tracking_projects_tasks_create(
          employeeConnection,
          {
            params: { projectId: targetProject.id },
            body,
          },
        );
      typia.assert(task);
      return task;
    },
  );
  const excludedBodies = [
    {
      title: `excluded-status-${RandomGenerator.alphabets(5)}`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      status: "completed",
      priority: "high",
      estimated_hours: 2,
      due_date: "2026-04-02T09:00:00.000Z",
      hrm_time_tracking_employee_id: employee.id,
      parent_id: null,
    },
    {
      title: `excluded-priority-${RandomGenerator.alphabets(5)}`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      status: "open",
      priority: "urgent",
      estimated_hours: 4,
      due_date: "2026-04-04T09:00:00.000Z",
      hrm_time_tracking_employee_id: employee.id,
      parent_id: null,
    },
    {
      title: `excluded-assignee-${RandomGenerator.alphabets(5)}`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      status: "open",
      priority: "high",
      estimated_hours: 6,
      hrm_time_tracking_employee_id: null,
      due_date: "2026-04-06T09:00:00.000Z",
      parent_id: null,
    },
  ] satisfies IHrmTimeTrackingTask.ICreate[];
  const targetExcludedTasks = await ArrayUtil.asyncMap(
    excludedBodies,
    async (body) => {
      const task =
        await generate_random_hrm_time_tracking_projects_tasks_create(
          employeeConnection,
          {
            params: { projectId: targetProject.id },
            body,
          },
        );
      typia.assert(task);
      return task;
    },
  );
  const outsideScopeTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      employeeConnection,
      {
        params: { projectId: extraProject.id },
        body: {
          title: `outside-scope-${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "open",
          priority: "high",
          estimated_hours: 7,
          due_date: "2026-04-01T08:00:00.000Z",
          hrm_time_tracking_employee_id: null,
          parent_id: null,
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(outsideScopeTask);
  const firstPageRequest = {
    status: "open",
    priority: "high",
    hrm_time_tracking_employee_id: employee.id,
    sort: "due_date",
    page: 1,
    limit: 2,
  } satisfies IHrmTimeTrackingTask.IRequest;
  const firstPage = await api.functional.hrmTimeTracking.projects.tasks.index(
    employeeConnection,
    {
      projectId: targetProject.id,
      body: firstPageRequest,
    },
  );
  typia.assert(firstPage);
  const expectedSortedMatching = [...targetMatchingTasks].sort(
    (x, y) =>
      (x.due_date ?? "").localeCompare(y.due_date ?? "") ||
      x.id.localeCompare(y.id),
  );
  const expectedFirstPageIds = expectedSortedMatching
    .slice(0, 2)
    .map((task) => task.id);
  const expectedSecondPageIds = expectedSortedMatching
    .slice(2, 4)
    .map((task) => task.id);
  const firstPageIds = firstPage.data.map((task) => task.id);
  TestValidator.equals("first page ids", firstPageIds, expectedFirstPageIds);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 2);
  TestValidator.equals(
    "first page records",
    firstPage.pagination.records,
    expectedSortedMatching.length,
  );
  TestValidator.equals(
    "first page pages",
    firstPage.pagination.pages,
    Math.ceil(expectedSortedMatching.length / 2),
  );
  await ArrayUtil.asyncForEach(firstPage.data, async (task) => {
    TestValidator.equals("task status filter applied", task.status, "open");
    TestValidator.equals("task priority filter applied", task.priority, "high");
    TestValidator.equals("task assignee exists", task.assignee !== null, true);
    if (task.assignee !== null) {
      TestValidator.equals(
        "task assignee matches filter",
        task.assignee.id,
        employee.id,
      );
    }
    TestValidator.predicate(
      "task is from expected filtered set",
      expectedSortedMatching.some((candidate) => candidate.id === task.id),
    );
  });
  await ArrayUtil.asyncForEach(targetExcludedTasks, async (task) => {
    TestValidator.predicate(
      "excluded target-project tasks are absent from first page",
      firstPageIds.includes(task.id) === false,
    );
  });
  TestValidator.predicate(
    "outside-scope task is absent from first page",
    firstPageIds.includes(outsideScopeTask.id) === false,
  );
  const secondPage = await api.functional.hrmTimeTracking.projects.tasks.index(
    employeeConnection,
    {
      projectId: targetProject.id,
      body: {
        ...firstPageRequest,
        page: 2,
      } satisfies IHrmTimeTrackingTask.IRequest,
    },
  );
  typia.assert(secondPage);
  const secondPageIds = secondPage.data.map((task) => task.id);
  TestValidator.equals("second page ids", secondPageIds, expectedSecondPageIds);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 2);
  TestValidator.equals(
    "second page records",
    secondPage.pagination.records,
    expectedSortedMatching.length,
  );
  TestValidator.equals(
    "second page pages",
    secondPage.pagination.pages,
    Math.ceil(expectedSortedMatching.length / 2),
  );
  TestValidator.predicate(
    "first and second pages do not overlap",
    secondPageIds.every((id) => firstPageIds.includes(id) === false),
  );
  await ArrayUtil.asyncForEach(secondPage.data, async (task) => {
    TestValidator.equals(
      "second page task status filter applied",
      task.status,
      "open",
    );
    TestValidator.equals(
      "second page task priority filter applied",
      task.priority,
      "high",
    );
    TestValidator.equals(
      "second page task assignee exists",
      task.assignee !== null,
      true,
    );
    if (task.assignee !== null) {
      TestValidator.equals(
        "second page task assignee matches filter",
        task.assignee.id,
        employee.id,
      );
    }
    TestValidator.predicate(
      "second page task is from expected filtered set",
      expectedSortedMatching.some((candidate) => candidate.id === task.id),
    );
  });
}
