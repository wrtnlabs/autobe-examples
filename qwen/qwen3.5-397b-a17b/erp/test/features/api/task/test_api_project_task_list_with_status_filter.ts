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

export async function test_api_project_task_list_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
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
  // 3. Create multiple tasks with different statuses
  const openTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Open Task - Testing status filter",
          status: "open",
          priority: "high",
          description: "This is an open task",
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(openTask);
  const inProgressTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "In Progress Task - Testing status filter",
          status: "in-progress",
          priority: "medium",
          description: "This is an in-progress task",
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(inProgressTask);
  const completedTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Completed Task - Testing status filter",
          status: "completed",
          priority: "low",
          description: "This is a completed task",
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(completedTask);
  // 4. Test: List all tasks without filter
  const allTasksResponse =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {} satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(allTasksResponse);
  TestValidator.equals(
    "all tasks count",
    allTasksResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "all tasks data length",
    allTasksResponse.data.length,
    3,
  );
  // 5. Test: Filter by status 'open'
  const openTasksResponse =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          status: "open",
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(openTasksResponse);
  TestValidator.equals(
    "open tasks count",
    openTasksResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "open tasks data length",
    openTasksResponse.data.length,
    1,
  );
  TestValidator.equals(
    "open task status",
    openTasksResponse.data[0].status,
    "open",
  );
  // 6. Test: Filter by status 'in-progress'
  const inProgressTasksResponse =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          status: "in-progress",
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(inProgressTasksResponse);
  TestValidator.equals(
    "in-progress tasks count",
    inProgressTasksResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "in-progress tasks data length",
    inProgressTasksResponse.data.length,
    1,
  );
  TestValidator.equals(
    "in-progress task status",
    inProgressTasksResponse.data[0].status,
    "in-progress",
  );
  // 7. Validate task summary required fields
  const taskSummary = allTasksResponse.data[0];
  TestValidator.predicate(
    "task has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      taskSummary.id,
    ),
  );
  TestValidator.predicate("task has title", taskSummary.title.length > 0);
  TestValidator.predicate(
    "task has valid status",
    ["open", "in-progress", "completed", "closed"].includes(taskSummary.status),
  );
  TestValidator.predicate(
    "task has valid priority",
    ["low", "medium", "high", "urgent"].includes(taskSummary.priority),
  );
  TestValidator.predicate(
    "task has project reference",
    taskSummary.project !== undefined && taskSummary.project.id !== undefined,
  );
  TestValidator.predicate(
    "task has created_at timestamp",
    taskSummary.created_at !== undefined && taskSummary.created_at.length > 0,
  );
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    allTasksResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    allTasksResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    allTasksResponse.pagination.records === allTasksResponse.data.length,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    allTasksResponse.pagination.pages >= 1,
  );
}
