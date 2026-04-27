import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_project_tasks_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // Create organization
  await generate_random_hrm_time_tracking_member_organizations_create(
    memberConnection,
    {},
  );
  // Create project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  // Get employee ID from the authorized member response
  const employeeId = authorized.employees[0]!.id;
  // Add member as project-lead
  await generate_random_hrm_time_tracking_member_projects_members_create(
    memberConnection,
    {
      body: {
        employee_id: employeeId,
        role: "project-lead" as const,
      },
      params: {
        projectId: project.id,
      },
    },
  );
  // Calculate dates
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const yesterday = new Date(now.getTime() - dayMs).toISOString();
  const tomorrow = new Date(now.getTime() + dayMs).toISOString();
  const nextWeek = new Date(now.getTime() + 7 * dayMs).toISOString();
  // Create Task A: status=open (default), priority=low, due_date=null
  await generate_random_hrm_time_tracking_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: "Task A - Low Priority",
        priority: "low",
        due_date: null,
      },
      params: { projectId: project.id },
    },
  );
  // Create Task B: status=open (default), priority=high, due_date=tomorrow
  await generate_random_hrm_time_tracking_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: "Task B - High Priority Tomorrow",
        priority: "high",
        due_date: tomorrow,
      },
      params: { projectId: project.id },
    },
  );
  // Create Task C: status=open (default), priority=high, due_date=yesterday
  await generate_random_hrm_time_tracking_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: "Task C - High Priority Yesterday",
        priority: "high",
        due_date: yesterday,
      },
      params: { projectId: project.id },
    },
  );
  // Create Task D: status=open (default), priority=urgent, due_date=next week
  await generate_random_hrm_time_tracking_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: "Task D - Urgent Priority Next Week",
        priority: "urgent",
        due_date: nextWeek,
      },
      params: { projectId: project.id },
    },
  );
  // Test 1: Filter by status="open" and sort by due_date asc
  const result1: IPageIHrmTimeTrackingTask.ISummary =
    await api.functional.hrmTimeTracking.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          status: "open",
          sortBy: "due_date",
          direction: "asc",
        } satisfies IHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(result1);
  // Validate all 4 tasks are returned
  TestValidator.equals("all tasks returned count", result1.data.length, 4);
  TestValidator.predicate(
    "pagination metadata present",
    result1.pagination.records === 4,
  );
  // Validate sorting: tasks should be sorted by due_date ascending
  // Order: Task C (yesterday) → Task B (tomorrow) → Task D (next week) → Task A (null)
  const sortedTitles = result1.data.map((t) => t.title);
  TestValidator.equals(
    "first task should be Task C (yesterday)",
    sortedTitles[0],
    "Task C - High Priority Yesterday",
  );
  TestValidator.equals(
    "second task should be Task B (tomorrow)",
    sortedTitles[1],
    "Task B - High Priority Tomorrow",
  );
  TestValidator.equals(
    "third task should be Task D (next week)",
    sortedTitles[2],
    "Task D - Urgent Priority Next Week",
  );
  TestValidator.equals(
    "fourth task should be Task A (no due date)",
    sortedTitles[3],
    "Task A - Low Priority",
  );
  // Test 2: Filter by priority="high" and sort by priority desc
  const result2: IPageIHrmTimeTrackingTask.ISummary =
    await api.functional.hrmTimeTracking.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          priority: "high",
          sortBy: "priority",
          direction: "desc",
        } satisfies IHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(result2);
  // Validate only high priority tasks are returned
  TestValidator.equals("high priority tasks count", result2.data.length, 2);
  TestValidator.predicate(
    "only high priority tasks returned",
    result2.data.every((t) => t.priority === "high"),
  );
  // Both tasks have priority=high, validate their titles
  const highPriorityTitles = result2.data.map((t) => t.title);
  TestValidator.predicate(
    "Task B is in high priority results",
    highPriorityTitles.includes("Task B - High Priority Tomorrow"),
  );
  TestValidator.predicate(
    "Task C is in high priority results",
    highPriorityTitles.includes("Task C - High Priority Yesterday"),
  );
  // Validate pagination for the second test
  TestValidator.equals(
    "pagination records matches filtered count",
    result2.pagination.records,
    2,
  );
}
