import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_admin_projects_tasks_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test that an authenticated admin can retrieve complete task details when they have access to the task's project through project membership.
 *
 * Setup:
 * 1. Admin user joins the system via authorize_admin_join
 * 2. Create a project within the organization
 * 3. Add the admin's employee record as a project member
 * 4. Create a task within that project with all fields populated
 *
 * Test Execution:
 * 1. Admin authenticates and obtains JWT tokens
 * 2. Admin calls GET /hrmPlatform/admin/tasks/{taskId} with the created task's ID
 * 3. Verify response contains complete IHrmPlatformTask object
 */
export async function test_api_task_retrieve_by_admin_with_project_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a project within the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Add admin's employee to project membership for access control
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: {},
      },
    );
  typia.assert(membership);
  // 4. Create a task within the project with all fields populated
  const statusOptions = ["open", "in-progress", "completed", "closed"] as const;
  const priorityOptions = ["low", "medium", "high", "urgent"] as const;
  const task = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: RandomGenerator.pick(statusOptions),
        priority: RandomGenerator.pick(priorityOptions),
        due_date: new Date().toISOString(),
        estimated_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
        >() satisfies number as number,
        assigned_employee_id: membership.employee.id,
        parent_task_id: null,
      },
    },
  );
  typia.assert(task);
  // 5. Admin retrieves the task by ID
  const retrievedTask = await api.functional.hrmPlatform.admin.tasks.at(
    adminConnection,
    {
      taskId: task.id,
    },
  );
  typia.assert(retrievedTask);
  // 6. Validate task details match the created task
  TestValidator.equals("task ID matches", retrievedTask.id, task.id);
  TestValidator.equals("task title matches", retrievedTask.title, task.title);
  TestValidator.equals(
    "task description matches",
    retrievedTask.description,
    task.description,
  );
  TestValidator.equals(
    "task status matches",
    retrievedTask.status,
    task.status,
  );
  TestValidator.equals(
    "task priority matches",
    retrievedTask.priority,
    task.priority,
  );
  TestValidator.equals(
    "task due_date matches",
    retrievedTask.due_date,
    task.due_date,
  );
  TestValidator.equals(
    "task estimated_hours matches",
    retrievedTask.estimated_hours,
    task.estimated_hours,
  );
  TestValidator.equals(
    "task deleted_at is null",
    retrievedTask.deleted_at,
    null,
  );
  // 7. Validate project relation is properly populated
  TestValidator.equals(
    "project ID matches",
    retrievedTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedTask.project.name,
    project.name,
  );
  TestValidator.equals(
    "project status matches",
    retrievedTask.project.status,
    project.status,
  );
  // 8. Validate assigned employee relation is properly populated
  TestValidator.equals(
    "assigned employee ID matches",
    retrievedTask.assignedEmployee?.id,
    membership.employee.id,
  );
  TestValidator.predicate(
    "assigned employee exists",
    retrievedTask.assignedEmployee !== null,
  );
  // 9. Validate parent task is null (this is a parent task)
  TestValidator.equals("parent task is null", retrievedTask.parentTask, null);
  // 10. Validate creator member relation is properly populated
  TestValidator.predicate(
    "creator member exists",
    retrievedTask.createdByMember !== null,
  );
  TestValidator.predicate(
    "creator member has valid email",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(retrievedTask.createdByMember.email),
  );
  // 11. Validate timestamps format (typia.assert already validates existence)
  TestValidator.predicate(
    "created_at is valid datetime",
    /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}/.test(
      retrievedTask.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}/.test(
      retrievedTask.updated_at,
    ),
  );
}
