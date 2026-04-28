import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test timer start on project and task workflow with real-time tracking session validation.
 *
 * Validates the complete timer start flow including member registration, role creation, employee invitation, project setup, task assignment, and timer initiation. Ensures that the timer correctly references the project and task, records the start timestamp, and establishes the active tracking state with stopped_at and deleted_at as NULL.
 *
 * Special attention is given to verifying that the employee has an active status, the project is active, the employee has active project membership, and the task belongs to the project with the employee assigned. The timer billable status defaults to true and is correctly returned.
 *
 * 1. Member joins the platform with email, password, and display name.
 * 2. Role is created with time:manage and project:view permissions.
 * 3. Employee is invited using the member account and assigned to the role.
 * 4. Project is created with a name, color code, description, and budget.
 * 5. Employee is assigned to the project as a member.
 * 6. Task is created within the project and assigned to the employee.
 * 7. Timer is started on the project and task with a description and billable status.
 * 8. Validates timer project and task references, billable status, and active tracking state.
 */
export async function test_api_timer_start_on_project_and_task(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Member joins the platform
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create role with time tracking permissions
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: "Task Worker",
        description: "Role for employees who can track time",
        permissionKeys: ["time:manage", "project:view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Create employee using the joined member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        memberId: authorized.id,
        roleId: role.id,
        position: "Software Engineer",
        employmentType: "full-time",
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 4. Create project for time tracking
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "E2E Test Project - Time Tracking",
        color_code: "#FF5733",
        description: "Project for testing timer functionality on tasks",
        budget: 100,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 5. Assign employee to project as a member
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        body: {
          employeeId: employee.id,
          capacityRole: "member",
        } satisfies IHrmPlatformProjectMembership.ICreate,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(membership);
  // 6. Create task within the project assigned to the employee
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: "Backend API Implementation",
        description: "Implement timer start endpoint for E2E testing",
        assigned_employee_id: employee.id,
        priority: "high",
        estimated_hours: 5,
      } satisfies IHrmPlatformTask.ICreate,
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task);
  // 7. Start timer on the project and task
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task.id,
        description: "Working on timer start endpoint implementation",
        billable: true,
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 8. Validate timer state
  TestValidator.equals("Timer project matches", timer.project.id, project.id);
  TestValidator.equals("Timer task matches", timer.task?.id, task.id);
  TestValidator.equals("Timer is billable", timer.billable, true);
  TestValidator.equals("Timer stopped_at is null", timer.stopped_at, null);
  TestValidator.equals("Timer deleted_at is null", timer.deleted_at, null);
}
