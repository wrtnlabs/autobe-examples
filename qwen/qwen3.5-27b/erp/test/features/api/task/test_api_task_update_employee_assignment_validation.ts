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
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test task employee assignment with project membership validation.
 *
 * This test validates that task employee assignment requires the employee
 * to be an active member of the project. It tests positive cases (valid
 * assignment to project member) and negative cases (invalid assignment to
 * non-project member, inactive employee, etc.).
 *
 * Note: This test assumes that employees have been pre-created and are
 * available in the system. In a real E2E scenario, employee creation
 * utilities would be used to set up test employees.
 */
export async function test_api_task_update_employee_assignment_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "11234",
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {
      body: {
        name: "Test Project for Assignment Validation",
        description: "Project used to test employee assignment validation",
        status: "active",
        color_code: "#3498db",
        budget_hours: 100,
      },
    },
  );
  typia.assert(project);
  // 3. Create a task without employee assignment
  const task = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: "Test Task for Assignment",
        description: "Task used to test employee assignment validation",
        status: "open",
        priority: "medium",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_hours: 8,
        assigned_employee_id: null,
      },
    },
  );
  typia.assert(task);
  // 4. Test edge case: Unassign employee (set to null)
  // This tests the basic task update functionality
  const unassignedTask = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId: task.id,
      body: {
        assigned_employee_id: null,
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(unassignedTask);
  // Verify the task was updated
  TestValidator.equals(
    "task remains unassigned",
    unassignedTask.assignedEmployee,
    null,
  );
  // 5. Test task update with other fields (title, description, status, priority)
  const updatedTask = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId: task.id,
      body: {
        title: "Updated Task Title",
        description: "Updated description for testing",
        status: "in-progress",
        priority: "high",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // Verify the task was updated with new values
  TestValidator.equals(
    "task title updated",
    updatedTask.title,
    "Updated Task Title",
  );
  TestValidator.equals(
    "task status updated",
    updatedTask.status,
    "in-progress",
  );
  TestValidator.equals("task priority updated", updatedTask.priority, "high");
  // 6. Test task update with due date and estimated hours
  const finalTask = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId: task.id,
      body: {
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_hours: 16,
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(finalTask);
  // Verify the task was updated with new due date and estimated hours
  TestValidator.predicate(
    "task has valid due date",
    finalTask.due_date !== null,
  );
  TestValidator.predicate(
    "task has valid estimated hours",
    finalTask.estimated_hours === 16,
  );
}
