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
 * Test task employee assignment validation ensuring only active project members can be assigned.
 *
 * This test validates that task assignment requires the employee to be an active member
 * of the project. It tests successful assignment to valid project members.
 */
export async function test_api_task_assignment_to_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as project creator (will be project lead)
  const creatorConnection: api.IConnection = { host: connection.host };
  const creatorAuth = await authorize_member_join(creatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(creatorAuth);
  // 2. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    creatorConnection,
    {},
  );
  typia.assert(project);
  // Add creator as project lead (using member ID as employee ID - assumes member has employee record)
  await generate_random_hrm_platform_member_projects_memberships_create(
    creatorConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: creatorAuth.id,
        role: "project-lead",
      },
    },
  );
  // 3. Create a task in the project without initial assignment
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    creatorConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // Verify task is initially unassigned
  TestValidator.equals(
    "task initially unassigned",
    task.assignedEmployee,
    null,
  );
  // POSITIVE TEST: Assign task to project lead (valid project member)
  const updatedTask = await api.functional.hrmPlatform.member.tasks.update(
    creatorConnection,
    {
      taskId: task.id,
      body: {
        assigned_employee_id: creatorAuth.id,
      },
    },
  );
  typia.assert(updatedTask);
  // Verify assignment was successful
  TestValidator.equals(
    "task assigned to project lead",
    updatedTask.assignedEmployee?.id,
    creatorAuth.id,
  );
  TestValidator.predicate(
    "assigned employee exists",
    updatedTask.assignedEmployee !== null,
  );
  TestValidator.equals("task title preserved", updatedTask.title, task.title);
  // Update other fields while keeping assignment
  const fullyUpdatedTask = await api.functional.hrmPlatform.member.tasks.update(
    creatorConnection,
    {
      taskId: task.id,
      body: {
        status: "in-progress",
        priority: "high",
      },
    },
  );
  typia.assert(fullyUpdatedTask);
  // Verify assignment persists after other updates
  TestValidator.equals(
    "assignment persists after status update",
    fullyUpdatedTask.assignedEmployee?.id,
    creatorAuth.id,
  );
  TestValidator.equals(
    "status updated correctly",
    fullyUpdatedTask.status,
    "in-progress",
  );
  TestValidator.equals(
    "priority updated correctly",
    fullyUpdatedTask.priority,
    "high",
  );
  // Unassign task by setting to null
  const unassignedTask = await api.functional.hrmPlatform.member.tasks.update(
    creatorConnection,
    {
      taskId: task.id,
      body: {
        assigned_employee_id: null,
      },
    },
  );
  typia.assert(unassignedTask);
  TestValidator.equals(
    "task unassigned successfully",
    unassignedTask.assignedEmployee,
    null,
  );
}
