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
 * Test that updating a task with a parent task relationship validates the parent belongs to the same project and is not itself a subtask (one-level nesting limit).
 *
 * Test Steps:
 * 1. Authenticate as a member and create an organization
 * 2. Create a project within the organization
 * 3. Assign the member as project-lead
 * 4. Create three tasks: Task A (top-level), Task B (top-level), Task C (will become subtask of Task A)
 * 5. Update Task C to set Task A as parent - should succeed (Task A is top-level in same project)
 * 6. Update Task B to set Task C as parent - should fail (Task C is already a subtask)
 * 7. Verify error response indicates parent task cannot be a subtask
 *
 * Validation Points:
 * - First update (Task C parent = Task A) returns 200 with Task C showing Task A as parentTask
 * - Second update (Task B parent = Task C) returns 400 error with message about parent task being a subtask
 * - Error message clearly states that parent task must not be a subtask (parent_task_id must be null)
 * - Validates one-level nesting constraint for subtask hierarchy
 */
export async function test_api_task_update_parent_task_validation_same_project_and_not_subtask(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 2. Select the organization as active context
  await api.functional.hrmPlatform.member.organizations.select(
    memberConnection,
    {
      organizationId: organization.id,
    },
  );
  // 3. Create a project within the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Assign the member as project-lead to enable task management
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_platform_employee_id: memberAuth.id,
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 5. Create three tasks: Task A (top-level), Task B (top-level), Task C (will become subtask)
  const taskA = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
        description: "Top-level task A",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(taskA);
  const taskB = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
        description: "Top-level task B",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(taskB);
  const taskC = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
        description: "Task C - will become subtask of Task A",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(taskC);
  // 6. Update Task C to set Task A as parent - should succeed (Task A is top-level in same project)
  const updatedTaskC =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: taskC.id,
        body: {
          parent_task_id: taskA.id,
        } satisfies IHrmPlatformTask.IUpdate,
      },
    );
  typia.assert(updatedTaskC);
  // Validate Task C now has Task A as parent
  TestValidator.equals(
    "Task C parent is Task A",
    updatedTaskC.parentTask?.id,
    taskA.id,
  );
  TestValidator.predicate(
    "Task A has no parent (top-level)",
    taskA.parentTask === null || taskA.parentTask === undefined,
  );
  // 7. Update Task B to set Task C as parent - should fail (Task C is already a subtask)
  await TestValidator.error("parent task cannot be a subtask", async () => {
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: taskB.id,
        body: {
          parent_task_id: taskC.id,
        } satisfies IHrmPlatformTask.IUpdate,
      },
    );
  });
}