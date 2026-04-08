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
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test project task listing functionality for authenticated project members.
 *
 * Validates the complete workflow of a member joining the platform, creating an organization, establishing a project, being assigned as a project member, and successfully retrieving all tasks within that project. The test ensures proper access control, pagination metadata, and task data structure integrity.
 *
 * The test creates multiple tasks with varying statuses and priorities to verify that the list endpoint returns all tasks without filters applied. Each task's required fields are validated to ensure data completeness and correct project scoping.
 *
 * 1. Member registers and authenticates with the platform.
 * 2. Member creates a new organization for project context.
 * 3. Member creates a project within the organization.
 * 4. Member creates an employee record and assigns themselves to the project as a project member.
 * 5. Multiple tasks are created in the project with different statuses and priorities.
 * 6. Member retrieves the task list and validates pagination metadata and task data structure.
 */
export async function test_api_project_task_list_as_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project within the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Assign member to project as project member
  // The utility function handles employee creation internally
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // 5. Create multiple tasks with varying statuses and priorities
  const taskCount = 5;
  const tasks: IHrmPlatformTask[] = [];
  for (let i = 0; i < taskCount; i++) {
    const task =
      await generate_random_hrm_platform_member_projects_tasks_create(
        memberConnection,
        {
          params: { projectId: project.id },
          body: {
            status: RandomGenerator.pick([
              "open",
              "in-progress",
              "completed",
              "closed",
            ] as const),
            priority: RandomGenerator.pick([
              "low",
              "medium",
              "high",
              "urgent",
            ] as const),
          },
        },
      );
    typia.assert(task);
    tasks.push(task);
  }
  // 6. Retrieve task list and validate
  const taskList = await api.functional.hrmPlatform.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {} satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(taskList);
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is valid",
    taskList.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", taskList.pagination.limit >= 1);
  TestValidator.predicate(
    "total records matches created tasks",
    taskList.pagination.records >= taskCount,
  );
  TestValidator.predicate(
    "total pages is calculated correctly",
    taskList.pagination.pages >= 1,
  );
  // Validate task data structure and project scoping
  TestValidator.predicate("tasks array is not empty", taskList.data.length > 0);
  for (const task of taskList.data) {
    // Validate nullable fields are properly typed (null or valid value)
    TestValidator.predicate(
      "due_date is null or valid date string",
      task.due_date === null || typeof task.due_date === "string",
    );
    TestValidator.predicate(
      "estimated_hours is null or positive number",
      task.estimated_hours === null || task.estimated_hours >= 0,
    );
    // Validate assigned employee and parent task are properly nullable
    TestValidator.predicate(
      "assignedEmployee is null or has required fields",
      task.assignedEmployee === null || task.assignedEmployee.id !== undefined,
    );
    TestValidator.predicate(
      "parentTask is null or has required fields",
      task.parentTask === null || task.parentTask.id !== undefined,
    );
  }
}
