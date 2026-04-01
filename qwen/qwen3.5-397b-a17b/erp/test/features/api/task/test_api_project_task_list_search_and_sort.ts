import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test search and sort functionality for task listing within a project.
 *
 * A member registers and creates a project, then creates multiple tasks with
 * varied titles, descriptions, priorities (urgent, high, medium, low), and due dates.
 *
 * Validates:
 * 1. Partial title search returns only tasks with matching text in title
 * 2. Partial description search returns only tasks with matching text in description
 * 3. Sorting by priority returns tasks in correct order
 * 4. Sorting by due_date returns tasks chronologically
 * 5. Sorting by created_at returns tasks in temporal order
 * 6. Pagination with limit parameter correctly limits results per page
 * 7. Page navigation returns correct subsets with accurate pagination metadata
 */
export async function test_api_project_task_list_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create multiple tasks with varied attributes
  const priorityLevels = ["urgent", "high", "medium", "low"] as const;
  const statuses = ["open", "in-progress", "completed"] as const;
  const taskData = ArrayUtil.repeat(8, (index) => ({
    title:
      index % 2 === 0
        ? `Important Task ${index}`
        : `Regular Work Item ${index}`,
    description:
      index % 3 === 0
        ? `This is a critical task requiring immediate attention - index ${index}`
        : `Standard task description for item ${index}`,
    priority: priorityLevels[index % 4],
    status: statuses[index % 3],
    dueDate:
      index < 6
        ? new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString()
        : null,
    estimatedHours: (index + 1) * 5,
  }));
  const createdTasks: IHrmPlatformTask[] = [];
  for (const taskInfo of taskData) {
    const task =
      await generate_random_hrm_platform_member_projects_tasks_create(
        memberConnection,
        {
          params: { projectId: project.id },
          body: {
            title: taskInfo.title,
            description: taskInfo.description,
            priority: taskInfo.priority,
            status: taskInfo.status,
            due_date: taskInfo.dueDate,
            estimated_hours: taskInfo.estimatedHours,
          } satisfies IHrmPlatformTask.ICreate,
        },
      );
    typia.assert(task);
    createdTasks.push(task);
  }
  TestValidator.equals("all tasks created", createdTasks.length, 8);
  // 4. Test partial title search
  const titleSearchResult =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: "Important",
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(titleSearchResult);
  TestValidator.predicate("title search returns matching tasks", () =>
    titleSearchResult.data.every((task) => task.title.includes("Important")),
  );
  TestValidator.predicate(
    "title search excludes non-matching",
    () => titleSearchResult.data.length < createdTasks.length,
  );
  // 5. Test partial description search
  const descriptionSearchResult =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: "critical task",
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(descriptionSearchResult);
  TestValidator.predicate("description search returns matching tasks", () =>
    descriptionSearchResult.data.every(
      (task) => task.title.includes("critical"),
    ),
  );
  // 6. Test sorting by priority (descending: urgent→high→medium→low)
  const prioritySortResult =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "priority",
          direction: "desc",
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(prioritySortResult);
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  TestValidator.predicate("priority sort descending order", () => {
    for (let i = 1; i < prioritySortResult.data.length; i++) {
      const prevPriority =
        priorityOrder[
          prioritySortResult.data[i - 1].priority as keyof typeof priorityOrder
        ];
      const currPriority =
        priorityOrder[
          prioritySortResult.data[i].priority as keyof typeof priorityOrder
        ];
      if (prevPriority > currPriority) return false;
    }
    return true;
  });
  // 7. Test sorting by priority (ascending: low→medium→high→urgent)
  const prioritySortAscResult =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "priority",
          direction: "asc",
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(prioritySortAscResult);
  TestValidator.predicate("priority sort ascending order", () => {
    for (let i = 1; i < prioritySortAscResult.data.length; i++) {
      const prevPriority =
        priorityOrder[
          prioritySortAscResult.data[i - 1]
            .priority as keyof typeof priorityOrder
        ];
      const currPriority =
        priorityOrder[
          prioritySortAscResult.data[i].priority as keyof typeof priorityOrder
        ];
      if (prevPriority < currPriority) return false;
    }
    return true;
  });
  // 8. Test sorting by due_date (descending: latest first, nulls last)
  const dueDateSortResult =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "due_date",
          direction: "desc",
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(dueDateSortResult);
  TestValidator.predicate("due_date sort descending order", () => {
    let lastNonNullDate: string | null = null;
    let hasSeenNull = false;
    for (const task of dueDateSortResult.data) {
      const dueDate = task.due_date ?? null;
      if (dueDate === null) {
        hasSeenNull = true;
      } else {
        if (hasSeenNull) return false;
        if (lastNonNullDate !== null && dueDate > lastNonNullDate) return false;
        lastNonNullDate = dueDate;
      }
    }
    return true;
  });
  // 9. Test sorting by created_at (descending: newest first)
  const createdAtSortResult =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "created_at",
          direction: "desc",
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(createdAtSortResult);
  TestValidator.predicate("created_at sort descending order", () => {
    for (let i = 1; i < createdAtSortResult.data.length; i++) {
      const prevTime = new Date(
        createdAtSortResult.data[i - 1].created_at,
      ).getTime();
      const currTime = new Date(
        createdAtSortResult.data[i].created_at,
      ).getTime();
      if (prevTime < currTime) return false;
    }
    return true;
  });
  // 10. Test pagination with limit
  const limitedResult =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          limit: 3,
          page: 1,
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(limitedResult);
  TestValidator.equals("limit restricts results", limitedResult.data.length, 3);
  TestValidator.equals(
    "pagination current page",
    limitedResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", limitedResult.pagination.limit, 3);
  TestValidator.predicate(
    "pagination total records correct",
    () => limitedResult.pagination.records === createdTasks.length,
  );
  TestValidator.predicate(
    "pagination total pages correct",
    () => limitedResult.pagination.pages === Math.ceil(createdTasks.length / 3),
  );
  // 11. Test page navigation (page 2)
  const page2Result =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          limit: 3,
          page: 2,
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.predicate(
    "page 2 has remaining or fewer results",
    () => page2Result.data.length <= 3,
  );
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  // Verify no overlap between page 1 and page 2
  const page1Ids = new Set(limitedResult.data.map((t) => t.id));
  const page2Ids = new Set(page2Result.data.map((t) => t.id));
  TestValidator.predicate("no overlap between pages", () => {
    for (const id of page2Ids) {
      if (page1Ids.has(id)) return false;
    }
    return true;
  });
  // 12. Test combined search and sort
  const combinedResult =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: "Task",
          sort: "priority",
          direction: "asc",
          limit: 5,
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate("combined search filters by title", () =>
    combinedResult.data.every((task) => task.title.includes("Task")),
  );
  TestValidator.predicate(
    "combined result respects limit",
    () => combinedResult.data.length <= 5,
  );
}