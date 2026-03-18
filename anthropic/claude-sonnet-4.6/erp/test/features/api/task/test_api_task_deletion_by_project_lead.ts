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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_deletion_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // Step 1: Register and authenticate the first member (org owner)
  // ============================================================
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // ============================================================
  // Step 2: Create an organization (owner becomes org owner with all permissions)
  // ============================================================
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // ============================================================
  // Step 3: Create a non-project:manage role (employee role) for the second member
  // ============================================================
  const employeeRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      ownerConnection,
      {
        body: {
          name: "Employee-" + RandomGenerator.alphaNumeric(6),
          permissions: ["employee:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(employeeRole);
  // ============================================================
  // Step 4: Register the second member (future project lead)
  // ============================================================
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLeadAuth = await authorize_member_join(
    projectLeadConnection,
    {},
  );
  // ============================================================
  // Step 5: Add the second member to the organization with the employee role
  // (No project:manage permission)
  // ============================================================
  const projectLeadOrgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: projectLeadAuth.id,
          roleId: employeeRole.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(projectLeadOrgMember);
  // ============================================================
  // Step 6: Create a project (as the owner with project:manage)
  // ============================================================
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // ============================================================
  // Step 7: Assign the second member to the project as project-lead
  // ============================================================
  const projectLeadMembership =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        body: {
          organizationMemberId: projectLeadOrgMember.id,
          projectRole: "project-lead",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectLeadMembership);
  // ============================================================
  // Step 8: Create a task in the project (as the owner)
  // ============================================================
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    ownerConnection,
    {
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task);
  // ============================================================
  // Test Execution: The project-lead (second member) deletes the task
  // Even though they don't have org-level project:manage permission
  // ============================================================
  await api.functional.erpHrm.member.projects.tasks.erase(
    projectLeadConnection,
    {
      projectId: project.id,
      taskId: task.id,
    },
  );
  // ============================================================
  // Validation: Regular project member (not project-lead) should be rejected
  // ============================================================
  // Register a third member as a regular project member
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMemberAuth = await authorize_member_join(
    regularMemberConnection,
    {},
  );
  // Add the third member to the organization with the same employee role
  const regularOrgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: regularMemberAuth.id,
          roleId: employeeRole.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(regularOrgMember);
  // Assign the third member to the project as a regular "member" (not project-lead)
  const regularMembership =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        body: {
          organizationMemberId: regularOrgMember.id,
          projectRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(regularMembership);
  // Create another task for the regular member to attempt to delete
  const task2 = await generate_random_erp_hrm_member_projects_tasks_create(
    ownerConnection,
    {
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task2);
  // The regular project member (not project-lead) should be rejected with 403
  await TestValidator.error("regular member cannot delete task", async () => {
    await api.functional.erpHrm.member.projects.tasks.erase(
      regularMemberConnection,
      {
        projectId: project.id,
        taskId: task2.id,
      },
    );
  });
}
