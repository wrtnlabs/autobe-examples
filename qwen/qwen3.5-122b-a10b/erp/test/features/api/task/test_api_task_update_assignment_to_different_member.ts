import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_projects_tasks_create } from "../../../generate/generate_random_hrm_member_organizations_projects_tasks_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_task } from "../../../prepare/prepare_random_hrm_task";

/**
 * Test task reassignment from one project member to another project member.
 *
 * Validates that a project lead can successfully reassign a task from one employee to another employee who is also a member of the same project. The test ensures proper validation of project membership and verifies that assignment changes do not create task history records (only status changes create history).
 *
 * This test covers the complete workflow of task reassignment including employee setup, project membership configuration, task creation, and assignment update validation. Special attention is given to verifying that both the original and new assignees are valid project members, and that the task history remains empty after assignment changes.
 *
 * 1. Create and authenticate a member user as project lead.
 * 2. Create a project within the member's organization.
 * 3. Create two additional member accounts to serve as employees.
 * 4. Assign both employees as project members with 'member' role.
 * 5. Assign the project lead user with 'project-lead' role to enable task management permissions.
 * 6. Create a task initially assigned to the first employee.
 * 7. Update the task to reassign it to the second employee.
 * 8. Validate the assigned_employee_id is correctly updated to the new employee.
 * 9. Validate the assignedEmployee relation reflects the new employee details.
 * 10. Validate taskHistories array is empty, confirming assignment changes do not create history records.
 */
export async function test_api_task_update_assignment_to_different_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member (project lead)
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLeadAuth = await authorize_member_join(projectLeadConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(projectLeadAuth);
  // Get organization ID from the authenticated member
  const organizationId = projectLeadAuth.organizations?.[0]?.id;
  if (!organizationId) {
    throw new Error("Member must belong to an organization");
  }
  // 2. Create project
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      projectLeadConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 3. Create two employees and assign them as project members
  const employee1Connection: api.IConnection = { host: connection.host };
  const employee1Auth = await authorize_member_join(employee1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employee1Auth);
  const employee2Connection: api.IConnection = { host: connection.host };
  const employee2Auth = await authorize_member_join(employee2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employee2Auth);
  // Assign both employees to the project
  const employee1Member =
    await generate_random_hrm_member_projects_members_create(
      projectLeadConnection,
      {
        body: {
          employee_id: employee1Auth.id,
          role: "member",
        },
        params: { projectId: project.id },
      },
    );
  typia.assert(employee1Member);
  const employee2Member =
    await generate_random_hrm_member_projects_members_create(
      projectLeadConnection,
      {
        body: {
          employee_id: employee2Auth.id,
          role: "member",
        },
        params: { projectId: project.id },
      },
    );
  typia.assert(employee2Member);
  // 4. Assign project lead as project-lead
  const projectLeadMember =
    await generate_random_hrm_member_projects_members_create(
      projectLeadConnection,
      {
        body: {
          employee_id: projectLeadAuth.id,
          role: "project-lead",
        },
        params: { projectId: project.id },
      },
    );
  typia.assert(projectLeadMember);
  // 5. Create task assigned to first employee
  const task =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      projectLeadConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          priority: "medium",
          assigned_employee_id: employee1Auth.id,
        },
        params: { organizationId, projectId: project.id },
      },
    );
  typia.assert(task);
  // Validate initial assignment
  TestValidator.equals(
    "task initially assigned to employee 1",
    task.assignedEmployee?.id,
    employee1Auth.id,
  );
  // 6. Update task to reassign to second employee
  const updatedTask =
    await api.functional.hrm.member.organizations.projects.tasks.update(
      projectLeadConnection,
      {
        organizationId,
        projectId: project.id,
        taskId: task.id,
        body: {
          assigned_employee_id: employee2Auth.id,
        },
      },
    );
  typia.assert(updatedTask);
  // 7. Validate the assignment changed
  TestValidator.equals(
    "task assigned to employee 2 after update",
    updatedTask.assignedEmployee?.id,
    employee2Auth.id,
  );
  // Validate assignedEmployee relation is populated with correct employee
  TestValidator.equals(
    "assignedEmployee relation contains employee 2",
    updatedTask.assignedEmployee?.id,
    employee2Auth.id,
  );
  // 8. Validate task history is NOT created for assignment changes
  // Assignment changes should not create task history records (only status changes do)
  TestValidator.equals(
    "taskHistories array is empty for assignment change",
    updatedTask.taskHistories.length,
    0,
  );
}
