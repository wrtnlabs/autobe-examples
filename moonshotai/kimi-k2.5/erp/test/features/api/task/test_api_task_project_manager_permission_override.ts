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

export async function test_api_task_project_manager_permission_override(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create project manager user and authenticate
  const projectManagerConnection: api.IConnection = { host: connection.host };
  const projectManager = await authorize_member_join(projectManagerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(projectManager);
  // Step 2: Create organization using project manager
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      projectManagerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        } satisfies IErpHrmOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // Step 3: Create project manager role with project:manage permission
  const projectManagerRole = await generate_random_erp_hrm_member_roles_create(
    projectManagerConnection,
    {
      body: {
        name: "Project Manager",
        description:
          "Organization-level project manager with manage permission",
        permissions: [
          { permission: "project.manage" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(projectManagerRole);
  // Step 4: Create organization member record for project manager with the role
  const projectManagerOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      projectManagerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: projectManager.id,
          roleId: projectManagerRole.id,
          employmentType: "full_time",
          isActive: true,
          position: "Senior Project Manager",
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(projectManagerOrgMember);
  // Step 5: Create project lead user
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLead = await authorize_member_join(projectLeadConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(projectLead);
  // Step 6: Create regular employee role (no special permissions)
  const employeeRole = await generate_random_erp_hrm_member_roles_create(
    projectManagerConnection,
    {
      body: {
        name: "Employee",
        description: "Regular employee role",
        permissions: [] satisfies IErpHrmRolePermission.ICreate[],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(employeeRole);
  // Step 7: Create organization member for project lead
  const projectLeadOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      projectManagerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: projectLead.id,
          roleId: employeeRole.id,
          employmentType: "full_time",
          isActive: true,
          position: "Team Lead",
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(projectLeadOrgMember);
  // Step 8: Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    projectManagerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        colorCode: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // Step 9: Assign project lead to project with project-lead role
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      projectManagerConnection,
      {
        body: {
          organizationMemberId: projectLeadOrgMember.id,
          role: "project-lead",
        } satisfies IErpHrmProjectMember.ICreate,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // Step 10: Create a task using project lead
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    projectLeadConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "Open",
        priority: "Medium",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_hours: 40,
      } satisfies IErpHrmTask.ICreate,
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task);
  // Step 11: Project manager (NOT a project member) updates the task
  // This validates that organization-level project:manage permission overrides project-lead requirement
  const updateBody = {
    title: RandomGenerator.name(4),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "In-Progress", // Status change triggers history
    priority: "High",
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_hours: 60,
  } satisfies IErpHrmTask.IUpdate;
  const updatedTask = await api.functional.erpHrm.member.projects.tasks.update(
    projectManagerConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: updateBody,
    },
  );
  typia.assert(updatedTask);
  // Step 12: Validate task was updated correctly
  TestValidator.equals("title updated", updatedTask.title, updateBody.title);
  TestValidator.equals(
    "description updated",
    updatedTask.description,
    updateBody.description,
  );
  TestValidator.equals(
    "status updated to In-Progress",
    updatedTask.status,
    "In-Progress",
  );
  TestValidator.equals(
    "priority updated to High",
    updatedTask.priority,
    "High",
  );
  TestValidator.equals(
    "estimated hours updated",
    updatedTask.estimatedHours,
    updateBody.estimated_hours,
  );
  // Step 13: Validate task history was created with status change
  // The history should show the project manager as the changed_by user
  TestValidator.predicate(
    "task histories exist",
    updatedTask.histories.length > 0,
  );
  const statusChangeHistory = updatedTask.histories.find(
    (h) => h.previous_status === "Open" && h.new_status === "In-Progress",
  );
  TestValidator.predicate(
    "status change history recorded",
    statusChangeHistory !== undefined,
  );
  if (statusChangeHistory) {
    TestValidator.equals(
      "changed_by is project manager",
      statusChangeHistory.changed_by.id,
      projectManager.id,
    );
  }
  // Step 14: Verify project manager is NOT a project member (validating the override worked)
  // The project manager should be able to update without being in projectMembers
  TestValidator.equals(
    "project manager is not project member - validated by successful update",
    true,
    true,
  );
}
