import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
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
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_task_list_filtering_by_status_and_priority(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
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
  // 3. Create multiple tasks with different statuses and priorities
  const taskOpenLow =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Open Low Priority Task",
          status: "open",
          priority: "low",
          estimated_hours: 5,
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(taskOpenLow);
  const taskOpenHigh =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Open High Priority Task",
          status: "open",
          priority: "high",
          estimated_hours: 10,
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(taskOpenHigh);
  const taskInProgressUrgent =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "In Progress Urgent Task",
          status: "in-progress",
          priority: "urgent",
          estimated_hours: 15,
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(taskInProgressUrgent);
  const taskInProgressMedium =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "In Progress Medium Priority Task",
          status: "in-progress",
          priority: "medium",
          estimated_hours: 8,
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(taskInProgressMedium);
  const taskCompletedHigh =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Completed High Priority Task",
          status: "completed",
          priority: "high",
          estimated_hours: 12,
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(taskCompletedHigh);
  const taskClosedUrgent =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Closed Urgent Task",
          status: "closed",
          priority: "urgent",
          estimated_hours: 20,
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(taskClosedUrgent);
  // 4. Test filtering by status (open and in-progress)
  const statusFilteredResult =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          status: ["open", "in-progress"],
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(statusFilteredResult);
  // Verify pagination metadata
  TestValidator.equals(
    "current page",
    statusFilteredResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has records",
    statusFilteredResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages calculated",
    statusFilteredResult.pagination.pages > 0,
  );
  // Verify only open and in-progress tasks are returned
  TestValidator.predicate(
    "all tasks have matching status",
    statusFilteredResult.data.every(
      (task) => task.status === "open" || task.status === "in-progress",
    ),
  );
  // Verify expected tasks are in the result
  const statusTaskIds = statusFilteredResult.data.map((t) => t.id);
  TestValidator.predicate(
    "open low task included",
    statusTaskIds.includes(taskOpenLow.id),
  );
  TestValidator.predicate(
    "open high task included",
    statusTaskIds.includes(taskOpenHigh.id),
  );
  TestValidator.predicate(
    "in progress urgent task included",
    statusTaskIds.includes(taskInProgressUrgent.id),
  );
  TestValidator.predicate(
    "in progress medium task included",
    statusTaskIds.includes(taskInProgressMedium.id),
  );
  TestValidator.predicate(
    "completed task excluded",
    !statusTaskIds.includes(taskCompletedHigh.id),
  );
  TestValidator.predicate(
    "closed task excluded",
    !statusTaskIds.includes(taskClosedUrgent.id),
  );
  // 5. Test filtering by priority (high and urgent)
  const priorityFilteredResult =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          priority: ["high", "urgent"],
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(priorityFilteredResult);
  // Verify only high and urgent priority tasks are returned
  TestValidator.predicate(
    "all tasks have matching priority",
    priorityFilteredResult.data.every(
      (task) => task.priority === "high" || task.priority === "urgent",
    ),
  );
  // Verify expected tasks are in the result
  const priorityTaskIds = priorityFilteredResult.data.map((t) => t.id);
  TestValidator.predicate(
    "open high task included",
    priorityTaskIds.includes(taskOpenHigh.id),
  );
  TestValidator.predicate(
    "in progress urgent task included",
    priorityTaskIds.includes(taskInProgressUrgent.id),
  );
  TestValidator.predicate(
    "completed high task included",
    priorityTaskIds.includes(taskCompletedHigh.id),
  );
  TestValidator.predicate(
    "closed urgent task included",
    priorityTaskIds.includes(taskClosedUrgent.id),
  );
  TestValidator.predicate(
    "low priority task excluded",
    !priorityTaskIds.includes(taskOpenLow.id),
  );
  TestValidator.predicate(
    "medium priority task excluded",
    !priorityTaskIds.includes(taskInProgressMedium.id),
  );
  // 6. Test combined status and priority filtering
  const combinedFilteredResult =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          status: ["open", "in-progress"],
          priority: ["high", "urgent"],
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(combinedFilteredResult);
  // Verify intersection: only open/in-progress AND high/urgent
  TestValidator.predicate(
    "all tasks match status filter",
    combinedFilteredResult.data.every(
      (task) => task.status === "open" || task.status === "in-progress",
    ),
  );
  TestValidator.predicate(
    "all tasks match priority filter",
    combinedFilteredResult.data.every(
      (task) => task.priority === "high" || task.priority === "urgent",
    ),
  );
  // Verify expected tasks in combined result
  const combinedTaskIds = combinedFilteredResult.data.map((t) => t.id);
  TestValidator.predicate(
    "open high task included in combined",
    combinedTaskIds.includes(taskOpenHigh.id),
  );
  TestValidator.predicate(
    "in progress urgent task included in combined",
    combinedTaskIds.includes(taskInProgressUrgent.id),
  );
  TestValidator.predicate(
    "completed high task excluded from combined",
    !combinedTaskIds.includes(taskCompletedHigh.id),
  );
  TestValidator.predicate(
    "closed urgent task excluded from combined",
    !combinedTaskIds.includes(taskClosedUrgent.id),
  );
  TestValidator.predicate(
    "open low task excluded from combined",
    !combinedTaskIds.includes(taskOpenLow.id),
  );
}
