import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
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
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test comprehensive filtering and sorting capabilities for task listing.
 * Validates query parameters and business logic for status, priority,
 * assigned employee filtering, search functionality, and sorting options.
 */
export async function test_api_task_list_filtering_and_sorting_by_priority_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member Authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create Project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        color_code: "#FF5733",
        budget_hours: typia.random<number & tags.Type<"uint32">>(),
      },
    },
  );
  typia.assert(project);
  // 3. Create multiple tasks with different attributes for comprehensive filtering tests
  const tasks: IHrmPlatformTask[] = [];
  // Task 1: Open, Urgent, unassigned
  const task1 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Urgent task for testing",
        description: "This is an urgent task",
        status: "open",
        priority: "urgent",
        due_date: new Date(Date.now() + 86400000).toISOString(),
        estimated_hours: 4,
      },
    },
  );
  typia.assert(task1);
  tasks.push(task1);
  // Task 2: In-progress, High priority, unassigned
  const task2 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "High priority task unassigned",
        description: "High priority but no assignee",
        status: "in-progress",
        priority: "high",
        due_date: new Date(Date.now() + 172800000).toISOString(),
        estimated_hours: 8,
      },
    },
  );
  typia.assert(task2);
  tasks.push(task2);
  // Task 3: Completed, Medium priority, unassigned
  const task3 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Completed medium task",
        description: "Already completed",
        status: "completed",
        priority: "medium",
        due_date: new Date(Date.now() - 86400000).toISOString(),
        estimated_hours: 2,
      },
    },
  );
  typia.assert(task3);
  tasks.push(task3);
  // Task 4: Closed, Low priority, unassigned, no due date
  const task4 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Low priority closed task",
        description: "Low priority and closed",
        status: "closed",
        priority: "low",
        estimated_hours: 1,
      },
    },
  );
  typia.assert(task4);
  tasks.push(task4);
  // Task 5: Open, High priority, for search testing
  const task5 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Searchable task with specific keywords",
        description: "Task for search testing",
        status: "open",
        priority: "high",
        due_date: new Date(Date.now() + 259200000).toISOString(),
        estimated_hours: 6,
      },
    },
  );
  typia.assert(task5);
  tasks.push(task5);
  // Task 6: In-progress, Medium priority, with due date
  const task6 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Medium in-progress task",
        description: "Another task for testing",
        status: "in-progress",
        priority: "medium",
        due_date: new Date(Date.now() + 432000000).toISOString(),
        estimated_hours: 3,
      },
    },
  );
  typia.assert(task6);
  tasks.push(task6);
  // 4. Test Status Filtering
  const statusFiltered = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        status: "open",
        page: 1,
        page_size: 100,
      },
    },
  );
  typia.assert(statusFiltered);
  TestValidator.equals(
    "status filter returns only open tasks",
    statusFiltered.pagination.records,
    2,
  );
  TestValidator.predicate(
    "all tasks have open status",
    statusFiltered.data.every((t) => t.status === "open"),
  );
  // 5. Test Priority Filtering
  const priorityFiltered = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        priority: "high",
        page: 1,
        page_size: 100,
      },
    },
  );
  typia.assert(priorityFiltered);
  TestValidator.equals(
    "priority filter returns only high priority tasks",
    priorityFiltered.pagination.records,
    2,
  );
  TestValidator.predicate(
    "all tasks have high priority",
    priorityFiltered.data.every((t) => t.priority === "high"),
  );
  // 6. Test Search Functionality (fuzzy search)
  const searchFiltered = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        search: "urgent",
        page: 1,
        page_size: 100,
      },
    },
  );
  typia.assert(searchFiltered);
  TestValidator.predicate(
    "search returns matching tasks",
    searchFiltered.pagination.records > 0,
  );
  TestValidator.predicate(
    "search results contain keyword in title",
    searchFiltered.data.every((t) => t.title.toLowerCase().includes("urgent")),
  );
  // 7. Test Combined Filters (status + priority)
  const combinedFiltered = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        status: "open",
        priority: "high",
        page: 1,
        page_size: 100,
      },
    },
  );
  typia.assert(combinedFiltered);
  TestValidator.equals(
    "combined filter returns correct count",
    combinedFiltered.pagination.records,
    1,
  );
  TestValidator.predicate(
    "combined filter matches both criteria",
    combinedFiltered.data.every(
      (t) => t.status === "open" && t.priority === "high",
    ),
  );
  // 8. Test Priority Sorting (descending: urgent > high > medium > low)
  const prioritySortedDesc =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        sort_by: "priority",
        sort_order: "desc",
        page: 1,
        page_size: 100,
      },
    });
  typia.assert(prioritySortedDesc);
  TestValidator.predicate(
    "priority sort descending: urgent comes first",
    prioritySortedDesc.data[0].priority === "urgent",
  );
  TestValidator.predicate(
    "priority sort descending: low comes last",
    prioritySortedDesc.data[prioritySortedDesc.data.length - 1].priority ===
      "low",
  );
  // 9. Test Priority Sorting (ascending: low < medium < high < urgent)
  const prioritySortedAsc = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        sort_by: "priority",
        sort_order: "asc",
        page: 1,
        page_size: 100,
      },
    },
  );
  typia.assert(prioritySortedAsc);
  TestValidator.predicate(
    "priority sort ascending: low comes first",
    prioritySortedAsc.data[0].priority === "low",
  );
  TestValidator.predicate(
    "priority sort ascending: urgent comes last",
    prioritySortedAsc.data[prioritySortedAsc.data.length - 1].priority ===
      "urgent",
  );
  // 10. Test Due Date Sorting (descending - NULLS FIRST)
  const dueDateSortedDesc = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        sort_by: "due_date",
        sort_order: "desc",
        page: 1,
        page_size: 100,
      },
    },
  );
  typia.assert(dueDateSortedDesc);
  TestValidator.predicate(
    "due date sort descending: NULL comes first",
    dueDateSortedDesc.data[0].due_date === null,
  );
  const nonNullDates = dueDateSortedDesc.data.filter(
    (t) => t.due_date !== null,
  );
  TestValidator.predicate(
    "due date sort descending: non-null dates are in descending order",
    nonNullDates.every((task, i, arr) => {
      if (i === 0) return true;
      return (
        new Date(task.due_date!).getTime() <=
        new Date(arr[i - 1].due_date!).getTime()
      );
    }),
  );
  // 11. Test Due Date Sorting (ascending - NULLS LAST)
  const dueDateSortedAsc = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        sort_by: "due_date",
        sort_order: "asc",
        page: 1,
        page_size: 100,
      },
    },
  );
  typia.assert(dueDateSortedAsc);
  TestValidator.predicate(
    "due date sort ascending: NULL comes last",
    dueDateSortedAsc.data[dueDateSortedAsc.data.length - 1].due_date === null,
  );
  const nonNullDatesAsc = dueDateSortedAsc.data.filter(
    (t) => t.due_date !== null,
  );
  TestValidator.predicate(
    "due date sort ascending: non-null dates are in ascending order",
    nonNullDatesAsc.every((task, i, arr) => {
      if (i === 0) return true;
      return (
        new Date(task.due_date!).getTime() >=
        new Date(arr[i - 1].due_date!).getTime()
      );
    }),
  );
  // 12. Test Created At Sorting (descending - newest first)
  const createdAtSortedDesc =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        page_size: 100,
      },
    });
  typia.assert(createdAtSortedDesc);
  TestValidator.predicate(
    "created at sort descending: newest task comes first",
    createdAtSortedDesc.data.every((task, i, arr) => {
      if (i === 0) return true;
      return (
        new Date(task.created_at).getTime() <=
        new Date(arr[i - 1].created_at).getTime()
      );
    }),
  );
  // 13. Test Created At Sorting (ascending - oldest first)
  const createdAtSortedAsc =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        page_size: 100,
      },
    });
  typia.assert(createdAtSortedAsc);
  TestValidator.predicate(
    "created at sort ascending: oldest task comes first",
    createdAtSortedAsc.data.every((task, i, arr) => {
      if (i === 0) return true;
      return (
        new Date(task.created_at).getTime() >=
        new Date(arr[i - 1].created_at).getTime()
      );
    }),
  );
  // 14. Test Pagination with Filters
  const paginatedFiltered = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        status: "open",
        page: 1,
        page_size: 1,
      },
    },
  );
  typia.assert(paginatedFiltered);
  TestValidator.equals(
    "pagination with filter: correct page size",
    paginatedFiltered.data.length,
    1,
  );
  TestValidator.equals(
    "pagination with filter: correct total records",
    paginatedFiltered.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination with filter: correct page count",
    paginatedFiltered.pagination.pages,
    2,
  );
  TestValidator.equals(
    "pagination with filter: current page",
    paginatedFiltered.pagination.current,
    1,
  );
  // 15. Test Pagination Page 2
  const paginatedPage2 = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        status: "open",
        page: 2,
        page_size: 1,
      },
    },
  );
  typia.assert(paginatedPage2);
  TestValidator.equals(
    "pagination page 2: correct page size",
    paginatedPage2.data.length,
    1,
  );
  TestValidator.equals(
    "pagination page 2: current page",
    paginatedPage2.pagination.current,
    2,
  );
  TestValidator.predicate(
    "pagination page 2: different task from page 1",
    paginatedPage2.data[0].id !== paginatedFiltered.data[0].id,
  );
  // 16. Test All Tasks (no filters)
  const allTasks = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        page: 1,
        page_size: 100,
      },
    },
  );
  typia.assert(allTasks);
  TestValidator.equals("all tasks count", allTasks.pagination.records, 6);
  TestValidator.predicate(
    "all tasks belong to the project",
    allTasks.data.every((t) => t.project.id === project.id),
  );
}
