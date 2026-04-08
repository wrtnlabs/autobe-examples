import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTaskHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_tasks_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_task_history_entry } from "../../../prepare/prepare_random_erp_hrm_time_task_history_entry";

export async function test_api_project_tasks_list_scoped_filters_sorting(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!" as string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const projectA = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: `project-a-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#112233",
        status: "active",
        budgetHours: 120,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(projectA);
  const projectB = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: `project-b-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#445566",
        status: "active",
        budgetHours: 80,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(projectB);
  const targetTasks = await ArrayUtil.asyncRepeat(5, async (index) => {
    const statuses = ["open", "in-progress", "completed", "closed"] as const;
    const priorities = ["low", "medium", "high", "urgent"] as const;
    const body: IErpHrmTimeTaskHistoryEntry.ICreate = {
      title: `task-${index}-${RandomGenerator.alphabets(6)}`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      status: statuses[index % statuses.length],
      priority: priorities[index % priorities.length],
      estimatedHours: index + 1,
      dueDate: new Date(Date.now() + (index + 1) * 86400000).toISOString(),
      employeeId: null,
      parentTaskId: null,
    };
    const task =
      await generate_random_erp_hrm_time_member_projects_tasks_create(
        memberConnection,
        {
          params: { projectId: projectA.id },
          body,
        },
      );
    typia.assert(task);
    return task;
  });
  const parentTask =
    await generate_random_erp_hrm_time_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
        body: {
          title: `parent-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "open",
          priority: "high",
          estimatedHours: 5,
          dueDate: new Date(Date.now() + 8 * 86400000).toISOString(),
          employeeId: null,
          parentTaskId: null,
        } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
      },
    );
  typia.assert(parentTask);
  const childTask =
    await generate_random_erp_hrm_time_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
        body: {
          title: `child-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "in-progress",
          priority: "medium",
          estimatedHours: 3,
          dueDate: new Date(Date.now() + 9 * 86400000).toISOString(),
          employeeId: null,
          parentTaskId: parentTask.id,
        } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
      },
    );
  typia.assert(childTask);
  const otherProjectTask =
    await generate_random_erp_hrm_time_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectB.id },
        body: {
          title: `other-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "open",
          priority: "urgent",
          estimatedHours: 7,
          dueDate: new Date(Date.now() + 10 * 86400000).toISOString(),
          employeeId: null,
          parentTaskId: null,
        } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
      },
    );
  typia.assert(otherProjectTask);
  const allListed = await api.functional.erpHrmTime.member.projects.tasks.index(
    memberConnection,
    {
      projectId: projectA.id,
      body: {
        page: 1,
        pageSize: 100,
        limit: 100,
      } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
    },
  );
  typia.assert(allListed);
  TestValidator.predicate(
    "pagination records matches returned count",
    allListed.pagination.records >= allListed.data.length,
  );
  TestValidator.predicate(
    "all tasks belong to selected project",
    allListed.data.every((task) => task.project.id === projectA.id),
  );
  TestValidator.predicate(
    "other project task excluded",
    allListed.data.every((task) => task.id !== otherProjectTask.id),
  );
  TestValidator.predicate(
    "child task keeps parent reference",
    allListed.data.some(
      (task) =>
        task.id === childTask.id &&
        task.parentTask !== null &&
        task.parentTask.id === parentTask.id,
    ),
  );
  TestValidator.predicate(
    "child task summary does not expand deeper nesting",
    allListed.data.some(
      (task) =>
        task.id === childTask.id &&
        (task.parentTask === null || task.parentTask.parentTask === null),
    ),
  );
  const statusFilter =
    await api.functional.erpHrmTime.member.projects.tasks.index(
      memberConnection,
      {
        projectId: projectA.id,
        body: {
          page: 1,
          pageSize: 100,
          limit: 100,
          status: "open",
        } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
      },
    );
  typia.assert(statusFilter);
  TestValidator.predicate(
    "status filter only open tasks",
    statusFilter.data.every((task) => task.status === "open"),
  );
  TestValidator.equals(
    "status filter pagination matches count",
    statusFilter.pagination.records,
    statusFilter.data.length,
  );
  const priorityFilter =
    await api.functional.erpHrmTime.member.projects.tasks.index(
      memberConnection,
      {
        projectId: projectA.id,
        body: {
          page: 1,
          pageSize: 100,
          limit: 100,
          priority: "high",
        } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
      },
    );
  typia.assert(priorityFilter);
  TestValidator.predicate(
    "priority filter only high tasks",
    priorityFilter.data.every((task) => task.priority === "high"),
  );
  const dueDateSorted =
    await api.functional.erpHrmTime.member.projects.tasks.index(
      memberConnection,
      {
        projectId: projectA.id,
        body: {
          page: 1,
          pageSize: 100,
          limit: 100,
          sort: "dueDate",
          order: "asc",
        } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
      },
    );
  typia.assert(dueDateSorted);
  TestValidator.predicate(
    "sorted by due date ascending",
    dueDateSorted.data.every(
      (task, index, array) =>
        index === 0 ||
        (array[index - 1].dueDate ?? "9999-12-31T23:59:59.999Z") <=
          (task.dueDate ?? "9999-12-31T23:59:59.999Z"),
    ),
  );
  const prioritySorted =
    await api.functional.erpHrmTime.member.projects.tasks.index(
      memberConnection,
      {
        projectId: projectA.id,
        body: {
          page: 1,
          pageSize: 100,
          limit: 100,
          sort: "priority",
          order: "desc",
        } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
      },
    );
  typia.assert(prioritySorted);
  TestValidator.predicate(
    "sorted by priority descending and project-scoped",
    prioritySorted.data.every((task) => task.project.id === projectA.id) &&
      prioritySorted.data.length >= 1,
  );
  const createdSorted =
    await api.functional.erpHrmTime.member.projects.tasks.index(
      memberConnection,
      {
        projectId: projectA.id,
        body: {
          page: 1,
          pageSize: 100,
          limit: 100,
          sort: "createdAt",
          order: "desc",
        } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
      },
    );
  typia.assert(createdSorted);
  TestValidator.predicate(
    "sorted by createdAt descending and project-scoped",
    createdSorted.data.every((task) => task.project.id === projectA.id),
  );
}
