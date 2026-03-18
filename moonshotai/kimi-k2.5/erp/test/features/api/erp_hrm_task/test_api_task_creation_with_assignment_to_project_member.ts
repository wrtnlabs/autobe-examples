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

export async function test_api_task_creation_with_assignment_to_project_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member (project lead creator) and authenticate
  const leadConnection: api.IConnection = { host: connection.host };
  const leadMember = await authorize_member_join(leadConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
    },
  });
  typia.assert(leadMember);
  // Step 2: Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(leadConnection, {
      body: {
        name: RandomGenerator.name(2),
        currency: "USD",
        timezone: "America/New_York",
        fiscal_year_start_month: 1,
      },
    });
  typia.assert(organization);
  // Step 3: Create project management role with necessary permissions
  const projectRole = await generate_random_erp_hrm_member_roles_create(
    leadConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        permissions: [
          { permission: "project.manage" },
          { permission: "project.view" },
          { permission: "task.manage" },
          { permission: "task.view" },
        ],
      },
    },
  );
  typia.assert(projectRole);
  // Step 4: Create second member (task assignee user)
  const assigneeConnection: api.IConnection = { host: connection.host };
  const assigneeMember = await authorize_member_join(assigneeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
    },
  });
  typia.assert(assigneeMember);
  // Step 5: Create organization member for lead user
  const leadOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      leadConnection,
      {
        body: {
          organizationId: organization.id,
          userId: leadMember.id,
          roleId: projectRole.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  typia.assert(leadOrgMember);
  // Step 6: Create organization member for assignee user
  const assigneeOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      leadConnection,
      {
        body: {
          organizationId: organization.id,
          userId: assigneeMember.id,
          roleId: projectRole.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  typia.assert(assigneeOrgMember);
  // Step 7: Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    leadConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        status: "active",
      },
    },
  );
  typia.assert(project);
  // Step 8: Assign lead as project-lead
  const leadProjectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      leadConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: leadOrgMember.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(leadProjectMember);
  // Step 9: Assign assignee as regular member
  const assigneeProjectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      leadConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: assigneeOrgMember.id,
          role: "member",
        },
      },
    );
  typia.assert(assigneeProjectMember);
  // Step 10: Create task as project lead, assigning to the second member
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    leadConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "Open",
        priority: "Medium",
        assigned_to_id: assigneeOrgMember.id,
        estimated_hours: typia.random<
          number & tags.Minimum<0> & tags.Maximum<100>
        >(),
      },
    },
  );
  typia.assert(task);
  // Step 11: Verify the task is created with correct assignee reference
  TestValidator.equals("task project matches", task.project.id, project.id);
  TestValidator.equals(
    "task assignee is not null",
    task.assignee !== null,
    true,
  );
  TestValidator.equals(
    "task assignee id matches",
    task.assignee!.id,
    assigneeOrgMember.id,
  );
  TestValidator.equals(
    "task assignee user id matches",
    task.assignee!.user.id,
    assigneeMember.id,
  );
  // Step 12: Verify task history entry is created documenting the assignment
  TestValidator.predicate(
    "task histories not empty",
    task.histories.length > 0,
  );
  const initialHistory = task.histories.find(
    (h) => h.previous_status === "" && h.new_status === "Open",
  );
  TestValidator.predicate(
    "initial history entry exists",
    initialHistory !== undefined,
  );
}
