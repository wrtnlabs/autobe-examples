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

export async function test_api_task_project_lead_reassignment_validation(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create project lead and authenticate
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLead = await authorize_member_join(projectLeadConnection, {});
  typia.assert(projectLead);
  // Create organization as project lead
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      projectLeadConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        } satisfies IErpHrmOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // Create role for project members
  const role = await generate_random_erp_hrm_member_roles_create(
    projectLeadConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: [{ permission: "project.manage" }],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // Create project lead organization member
  const projectLeadOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      projectLeadConnection,
      {
        body: {
          organizationId: organization.id,
          userId: projectLead.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(projectLeadOrgMember);
  // Create initial assignee global user and organization member
  const initialAssigneeConnection: api.IConnection = { host: connection.host };
  const initialAssigneeUser = await authorize_member_join(
    initialAssigneeConnection,
    {},
  );
  typia.assert(initialAssigneeUser);
  const initialAssignee =
    await generate_random_erp_hrm_member_organization_members_create(
      projectLeadConnection,
      {
        body: {
          organizationId: organization.id,
          userId: initialAssigneeUser.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(initialAssignee);
  // Create new assignee global user and organization member
  const newAssigneeConnection: api.IConnection = { host: connection.host };
  const newAssigneeUser = await authorize_member_join(
    newAssigneeConnection,
    {},
  );
  typia.assert(newAssigneeUser);
  const newAssignee =
    await generate_random_erp_hrm_member_organization_members_create(
      projectLeadConnection,
      {
        body: {
          organizationId: organization.id,
          userId: newAssigneeUser.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(newAssignee);
  // Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    projectLeadConnection,
    {
      body: {
        name: RandomGenerator.name(),
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // Assign project lead to project with project-lead role
  await generate_random_erp_hrm_member_projects_members_create(
    projectLeadConnection,
    {
      params: { projectId: project.id },
      body: {
        organizationMemberId: projectLeadOrgMember.id,
        role: "project-lead",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  // Assign initial assignee to project as member
  await generate_random_erp_hrm_member_projects_members_create(
    projectLeadConnection,
    {
      params: { projectId: project.id },
      body: {
        organizationMemberId: initialAssignee.id,
        role: "member",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  // Assign new assignee to project as member
  await generate_random_erp_hrm_member_projects_members_create(
    projectLeadConnection,
    {
      params: { projectId: project.id },
      body: {
        organizationMemberId: newAssignee.id,
        role: "member",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  // Create task initially assigned to initial assignee
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    projectLeadConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.name(),
        assigned_to_id: initialAssignee.id,
        status: "Open",
        priority: "Medium",
      } satisfies IErpHrmTask.ICreate,
    },
  );
  typia.assert(task);
  // Validate initial assignment
  TestValidator.equals(
    "initial assignee matches",
    task.assignee?.id,
    initialAssignee.id,
  );
  // Reassign task to new assignee
  const updatedTask = await api.functional.erpHrm.member.projects.tasks.update(
    projectLeadConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: {
        assigned_to_id: newAssignee.id,
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // Validate reassignment
  TestValidator.equals(
    "assignee updated to new member",
    updatedTask.assignee?.id,
    newAssignee.id,
  );
  TestValidator.equals(
    "new assignee user details populated",
    updatedTask.assignee?.user.id,
    newAssigneeUser.id,
  );
  // Validate other properties unchanged
  TestValidator.equals("task title unchanged", updatedTask.title, task.title);
  TestValidator.equals(
    "task status unchanged",
    updatedTask.status,
    task.status,
  );
  TestValidator.equals(
    "task priority unchanged",
    updatedTask.priority,
    task.priority,
  );
  TestValidator.equals(
    "task description unchanged",
    updatedTask.description,
    task.description,
  );
  // Validate no task history created for assignment-only change
  TestValidator.equals(
    "no task history for assignment change",
    updatedTask.histories.length,
    0,
  );
}
