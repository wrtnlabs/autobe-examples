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
 * Test that a project lead can successfully create a task within their assigned project and assign it to a project member.
 *
 * Setup:
 * 1. Register and authenticate as a member who will become a project lead
 * 2. Create a project where the lead is the project lead
 * 3. Register another member to be assigned as task assignee
 * 4. Add the second member as a project member (not lead)
 *
 * Test Steps:
 * 1. As the authenticated project lead, create a task with all required fields
 * 2. Verify the response contains all expected fields
 * 3. Verify business rules are enforced
 */
export async function test_api_task_creation_by_project_lead_with_employee_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as project lead
  const leadConnection: api.IConnection = { host: connection.host };
  const leadAuth = await authorize_member_join(leadConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  typia.assert(leadAuth);
  // 2. Create a project (the lead will be project lead by default)
  const project = await generate_random_hrm_platform_member_projects_create(
    leadConnection,
    {
      body: {
        name: "Authentication System",
        description: "Build complete authentication system",
        status: "active",
        color_code: "#3498db",
        budget_hours: 160,
      },
    },
  );
  typia.assert(project);
  // 3. Register second member to be assigned as task assignee
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  typia.assert(memberAuth);
  // 4. Add second member as project member (not lead)
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      leadConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: memberAuth.id,
          role: "member",
        },
      },
    );
  typia.assert(membership);
  // 5. Create task as project lead with employee assignment
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7); // 7 days from now
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    leadConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Implement user authentication",
        description: "Add login and registration functionality",
        status: "open",
        priority: "high",
        due_date: dueDate.toISOString(),
        estimated_hours: 16,
        assigned_employee_id: membership.employee.id,
        parent_task_id: null,
      },
    },
  );
  typia.assert(task);
  // 6. Verify task response contains all expected fields
  TestValidator.predicate(
    "task has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      task.id,
    ),
  );
  TestValidator.equals(
    "task title matches input",
    task.title,
    "Implement user authentication",
  );
  TestValidator.equals(
    "task description matches input",
    task.description,
    "Add login and registration functionality",
  );
  TestValidator.equals("task status is open", task.status, "open");
  TestValidator.equals("task priority is high", task.priority, "high");
  TestValidator.equals(
    "task due_date is set",
    task.due_date,
    dueDate.toISOString(),
  );
  TestValidator.equals("task estimated_hours is 16", task.estimated_hours, 16);
  TestValidator.equals("task parentTask is null", task.parentTask, null);
  TestValidator.equals("task deleted_at is null", task.deleted_at, null);
  // 7. Verify task is associated with correct project
  TestValidator.equals(
    "task belongs to correct project",
    task.project.id,
    project.id,
  );
  TestValidator.equals(
    "task project name matches",
    task.project.name,
    project.name,
  );
  // 8. Verify assigned employee is the project member
  TestValidator.predicate(
    "task has assigned employee",
    task.assignedEmployee !== null,
  );
  typia.assertGuard(task.assignedEmployee!);
  TestValidator.equals(
    "assigned employee ID matches member",
    task.assignedEmployee.id,
    membership.employee.id,
  );
  // 9. Verify creator is the project lead
  TestValidator.equals(
    "task created by lead member",
    task.createdByMember.id,
    leadAuth.id,
  );
  TestValidator.equals(
    "task created by lead email",
    task.createdByMember.email,
    leadAuth.email,
  );
  // 10. Verify timestamps are present
  TestValidator.predicate("task has created_at", task.created_at !== undefined);
  TestValidator.predicate("task has updated_at", task.updated_at !== undefined);
}
