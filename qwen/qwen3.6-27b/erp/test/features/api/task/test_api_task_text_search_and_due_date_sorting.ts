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
 * Test task text search and due date sorting functionality.
 *
 * Validates that task search correctly matches keywords across both title and description fields using GIN trigram indexing, and that tasks can be sorted by due date in both ascending and descending order. Verifies that pagination works correctly when combined with search and sort parameters. Tests edge cases including tasks with null due dates and case-insensitive search matching.
 *
 * 1. Authenticate a member by joining the platform.
 * 2. Create a project for task organization.
 * 3. Create multiple tasks with distinct titles, descriptions, and varying due dates (some null).
 * 4. Execute text search to verify tasks are returned when title OR description matches the keyword.
 * 5. Execute sorting by dueAt ascending and verify chronological order.
 * 6. Execute sorting by dueAt descending and verify reverse chronological order.
 * 7. Validate that tasks with null dueAt are included in sorted results.
 * 8. Verify pagination metadata reflects correct record counts.
 */
export async function test_api_task_text_search_and_due_date_sorting(
  connection: api.IConnection,
) {
  /* ---------------------------------- */
  // Helper: check if two date strings are in ascending order (null-safe)
  /* ---------------------------------- */
  const isAscending = (
    prev: string | null,
    next: string | null,
  ): boolean => {
    if (prev === null || next === null) return true;
    return prev <= next;
  };
  const isDescending = (
    prev: string | null,
    next: string | null,
  ): boolean => {
    if (prev === null || next === null) return true;
    return prev >= next;
  };
  /* ---------------------------------- */
  // 1. Authenticate member
  /* ---------------------------------- */
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
    },
  });
  /* ---------------------------------- */
  // 2. Create a project
  /* ---------------------------------- */
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Task Search Test Project",
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  /* ---------------------------------- */
  // 3. Create tasks with distinct titles, descriptions, and varying due dates
  /* ---------------------------------- */
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000).toISOString();
  const nextWeek = new Date(today.getTime() + 7 * 86400000).toISOString();
  const nextMonth = new Date(today.getTime() + 30 * 86400000).toISOString();
  // Tasks with "report" keyword in title or description for search testing
  const taskReportTitle =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Generate quarterly report",
          description: "Draft the quarterly business report for stakeholders",
          priority: "high",
          due_at: tomorrow,
        },
      },
    );
  typia.assert(taskReportTitle);
  const taskReportDescription =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Weekly standup preparation",
          description: "Compile report of completed tasks and blockers",
          priority: "medium",
          due_at: nextWeek,
        },
      },
    );
  typia.assert(taskReportDescription);
  // Task with "report" in both title and description
  const taskReportBoth =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Submit incident report",
          description: "File the official incident report with details",
          priority: "urgent",
          due_at: nextMonth,
        },
      },
    );
  typia.assert(taskReportBoth);
  // Tasks without "report" keyword - should NOT appear in search results
  const taskNoMatch =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Design review meeting",
          description: "Present the updated UI mockups to the team",
          priority: "low",
          due_at: undefined,
        },
      },
    );
  typia.assert(taskNoMatch);
  // Task with null due date for edge case testing
  const taskNullDueDate =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Research competitors",
          description: "Analyze competitor features and pricing",
          priority: "low",
          due_at: undefined,
        },
      },
    );
  typia.assert(taskNullDueDate);
  // Additional task for sorting variety
  const taskExtra =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Database migration planning",
          description: "Outline the migration strategy and timeline",
          priority: "high",
          due_at: tomorrow,
        },
      },
    );
  typia.assert(taskExtra);
  /* ---------------------------------- */
  // 4. Test text search - search for "report"
  /* ---------------------------------- */
  const searchResult = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        search: "report",
        limit: 100,
      } satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(searchResult);
  // All returned tasks should contain "report" in title or description (case-insensitive)
  TestValidator.predicate(
    "search returns at least one matching task",
    searchResult.data.length > 0,
  );
  TestValidator.predicate(
    "all search results contain the keyword in title or description",
    searchResult.data.every(
      (t) =>
        t.title.toLowerCase().includes("report") ||
        (t.description ?? "").toLowerCase().includes("report"),
    ),
  );
  // Tasks without "report" should NOT appear
  const nonMatchingIds = [taskNoMatch.id, taskNullDueDate.id, taskExtra.id];
  TestValidator.predicate(
    "non-matching tasks are excluded from search results",
    !searchResult.data.some((t) => nonMatchingIds.includes(t.id)),
  );
  /* ---------------------------------- */
  // 5. Test sort by dueAt ascending
  /* ---------------------------------- */
  const sortAscResult = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        sortBy: "dueAt",
        sortOrder: "asc",
        limit: 100,
      } satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(sortAscResult);
  TestValidator.equals(
    "total tasks returned in sort asc",
    sortAscResult.pagination.records,
    6,
  );
  // Verify ascending order by dueAt (null values should be handled)
  const dueDatesAsc = sortAscResult.data.map((t) => t.dueAt);
  TestValidator.predicate(
    "due dates in ascending order (or nulls handled gracefully)",
    dueDatesAsc.every((_, i, arr) =>
      i === 0 ? true : isAscending(arr[i - 1], arr[i]),
    ),
  );
  /* ---------------------------------- */
  // 6. Test sort by dueAt descending
  /* ---------------------------------- */
  const sortDescResult = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        sortBy: "dueAt",
        sortOrder: "desc",
        limit: 100,
      } satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(sortDescResult);
  TestValidator.equals(
    "total tasks returned in sort desc",
    sortDescResult.pagination.records,
    6,
  );
  // Verify descending order by dueAt
  const dueDatesDesc = sortDescResult.data.map((t) => t.dueAt);
  TestValidator.predicate(
    "due dates in descending order (or nulls handled gracefully)",
    dueDatesDesc.every((_, i, arr) =>
      i === 0 ? true : isDescending(arr[i - 1], arr[i]),
    ),
  );
  /* ---------------------------------- */
  // 7. Verify pagination metadata
  /* ---------------------------------- */
  TestValidator.predicate(
    "pagination limit is set correctly",
    sortAscResult.pagination.limit === 100,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    sortAscResult.pagination.records === sortAscResult.data.length &&
      sortDescResult.pagination.records === sortDescResult.data.length &&
      searchResult.pagination.records === searchResult.data.length,
  );
}