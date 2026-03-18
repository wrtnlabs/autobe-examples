import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_retrieval_by_regular_member_assigned_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate manager user
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {});
  // 2. Create organization as manager
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {},
    );
  // 3. Create manager role with project management permissions
  const managerPermissions: IErpHrmRolePermission.ICreate[] = [
    { permission: "project.manage" },
    { permission: "employee.manage" },
    { permission: "organization.manage" },
  ];
  const managerRole = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: "Manager Role",
        description: "Project management role",
        permissions: managerPermissions,
      },
    },
  );
  // Create manager as organization member
  const managerOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: manager.id,
          roleId: managerRole.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  // 4. Create project as manager
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {
      body: {
        name: "Test Project",
        status: "active",
      },
    },
  );
  // 5. Assign manager as project-lead to the project
  await generate_random_erp_hrm_member_projects_members_create(
    managerConnection,
    {
      params: { projectId: project.id },
      body: {
        organizationMemberId: managerOrgMember.id,
        role: "project-lead",
      },
    },
  );
  // 6. Create and authenticate employee user
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {});
  // 7. Create employee role with regular permissions
  const employeePermissions: IErpHrmRolePermission.ICreate[] = [
    { permission: "employee.view" },
    { permission: "project.view" },
  ];
  const employeeRole = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: "Employee Role",
        description: "Regular employee role",
        permissions: employeePermissions,
      },
    },
  );
  // Create employee as organization member
  const employeeOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employee.id,
          roleId: employeeRole.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  // 8. Assign employee as regular member to the project (not project-lead)
  await generate_random_erp_hrm_member_projects_members_create(
    managerConnection,
    {
      params: { projectId: project.id },
      body: {
        organizationMemberId: employeeOrgMember.id,
        role: "member",
      },
    },
  );
  // 9. Create task assigned to employee as manager
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    managerConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Assigned Task for Employee",
        description: "Test task assigned to regular member",
        status: "Open",
        priority: "High",
        due_date: dueDate.toISOString(),
        estimated_hours: 8,
        assigned_to_id: employeeOrgMember.id,
      },
    },
  );
  // 10. Employee retrieves their assigned task
  const retrievedTask = await api.functional.erpHrm.member.projects.tasks.at(
    employeeConnection,
    {
      projectId: project.id,
      taskId: task.id,
    },
  );
  // 11. Validate task details
  typia.assert(retrievedTask);
  // Validate task contains expected information
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
    "task due date matches",
    retrievedTask.dueDate,
    task.dueDate,
  );
  TestValidator.equals(
    "task estimated hours matches",
    retrievedTask.estimatedHours,
    task.estimatedHours,
  );
  // Validate assignment information
  TestValidator.predicate("task has assignee", retrievedTask.assignee !== null);
  if (retrievedTask.assignee !== null) {
    TestValidator.equals(
      "assignee id matches",
      retrievedTask.assignee.id,
      employeeOrgMember.id,
    );
    TestValidator.equals(
      "assignee user email matches",
      retrievedTask.assignee.user.email,
      employee.email,
    );
  }
  // Validate project information is included
  TestValidator.equals(
    "task project id matches",
    retrievedTask.project.id,
    project.id,
  );
}
