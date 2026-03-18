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

export async function test_api_task_retrieval_by_project_lead_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as primary member (project lead)
  const leadConnection: api.IConnection = { host: connection.host };
  const leadMember = await authorize_member_join(leadConnection, {
    body: {
      firstName: "Project",
      lastName: "Lead",
    },
  });
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(leadConnection, {
      body: {
        name: "Test Organization",
        currency: "USD",
        timezone: "America/New_York",
        fiscal_year_start_month: 1,
      } satisfies IErpHrmOrganization.ICreate,
    });
  // 3. Create custom role with project management permissions
  const managerRole = await generate_random_erp_hrm_member_roles_create(
    leadConnection,
    {
      body: {
        name: "Project Manager",
        description: "Role with project management capabilities",
        permissions: [
          { permission: "project.manage" },
          { permission: "employee.view" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  // 4. Create organization member for the lead user
  const leadOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      leadConnection,
      {
        body: {
          organizationId: organization.id,
          userId: leadMember.id,
          roleId: managerRole.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  // 5. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    leadConnection,
    {
      body: {
        name: "Test Project",
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  // 6. Assign lead as project-lead
  await generate_random_erp_hrm_member_projects_members_create(leadConnection, {
    params: { projectId: project.id },
    body: {
      organizationMemberId: leadOrgMember.id,
      role: "project-lead",
    } satisfies IErpHrmProjectMember.ICreate,
  });
  // 7. Create second member for task assignment
  const assigneeConnection: api.IConnection = { host: connection.host };
  const assigneeMember = await authorize_member_join(assigneeConnection, {
    body: {
      firstName: "Task",
      lastName: "Assignee",
    },
  });
  const employeeRole = await generate_random_erp_hrm_member_roles_create(
    leadConnection,
    {
      body: {
        name: "Developer",
        permissions: [
          { permission: "employee.view" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  const assigneeOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      leadConnection,
      {
        body: {
          organizationId: organization.id,
          userId: assigneeMember.id,
          roleId: employeeRole.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  // 8. Assign assignee as project member
  await generate_random_erp_hrm_member_projects_members_create(leadConnection, {
    params: { projectId: project.id },
    body: {
      organizationMemberId: assigneeOrgMember.id,
      role: "member",
    } satisfies IErpHrmProjectMember.ICreate,
  });
  // 9. Create parent task
  const parentTask = await generate_random_erp_hrm_member_projects_tasks_create(
    leadConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Parent Task",
        description: "Main task for testing",
        status: "Open",
        priority: "High",
        assigned_to_id: assigneeOrgMember.id,
        estimated_hours: 8,
      } satisfies IErpHrmTask.ICreate,
    },
  );
  // 10. Create child task (subtask)
  const childTask = await generate_random_erp_hrm_member_projects_tasks_create(
    leadConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Child Subtask",
        description: "Subtask under parent",
        status: "Open",
        priority: "Medium",
        assigned_to_id: assigneeOrgMember.id,
        parent_task_id: parentTask.id,
        estimated_hours: 4,
      } satisfies IErpHrmTask.ICreate,
    },
  );
  // 11. Retrieve parent task with full details
  const retrievedTask = await api.functional.erpHrm.member.projects.tasks.at(
    leadConnection,
    {
      projectId: project.id,
      taskId: parentTask.id,
    },
  );
  // 12. Validate complete structure
  typia.assert(retrievedTask);
  // 13. Verify business logic and relationships
  TestValidator.equals(
    "task title matches",
    retrievedTask.title,
    parentTask.title,
  );
  TestValidator.equals(
    "task description matches",
    retrievedTask.description,
    parentTask.description,
  );
  TestValidator.equals(
    "task status matches",
    retrievedTask.status,
    parentTask.status,
  );
  TestValidator.equals(
    "task priority matches",
    retrievedTask.priority,
    parentTask.priority,
  );
  TestValidator.equals(
    "project summary populated",
    retrievedTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedTask.project.name,
    project.name,
  );
  TestValidator.equals(
    "assignee populated",
    retrievedTask.assignee?.id,
    assigneeOrgMember.id,
  );
  TestValidator.equals(
    "assignee user email matches",
    retrievedTask.assignee?.user.email,
    assigneeMember.email,
  );
  TestValidator.equals(
    "parent task is null for top-level",
    retrievedTask.parentTask,
    null,
  );
  TestValidator.equals(
    "child tasks array contains subtask",
    retrievedTask.childTasks.length,
    1,
  );
  TestValidator.equals(
    "child task id matches",
    retrievedTask.childTasks[0]?.id,
    childTask.id,
  );
  TestValidator.equals(
    "child task title matches",
    retrievedTask.childTasks[0]?.title,
    childTask.title,
  );
  TestValidator.predicate(
    "task history exists",
    retrievedTask.histories.length > 0,
  );
}
