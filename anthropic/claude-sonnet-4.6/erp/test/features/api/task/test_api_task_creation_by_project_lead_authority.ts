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

export async function test_api_task_creation_by_project_lead_authority(
  connection: api.IConnection,
): Promise<void> {
  // ----------------------------------------------------------------
  // Step 1: Join as first member (owner)
  // ----------------------------------------------------------------
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // ----------------------------------------------------------------
  // Step 2: Create an organization (first member becomes Owner)
  // ----------------------------------------------------------------
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // ----------------------------------------------------------------
  // Step 3: Create a minimal custom role (only employee:view, NO project:manage)
  // ----------------------------------------------------------------
  const minimalRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      ownerConnection,
      {
        body: {
          name: "MinimalRole_" + RandomGenerator.alphaNumeric(8),
          permissions: ["employee:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(minimalRole);
  // ----------------------------------------------------------------
  // Step 4: Join as second member (the future project lead)
  // ----------------------------------------------------------------
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLeadAuth = await authorize_member_join(
    projectLeadConnection,
    {},
  );
  typia.assert(projectLeadAuth);
  // ----------------------------------------------------------------
  // Step 5: Add second member to organization with minimal role
  // ----------------------------------------------------------------
  const projectLeadOrgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: projectLeadAuth.member.id,
          roleId: minimalRole.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(projectLeadOrgMember);
  // ----------------------------------------------------------------
  // Step 6: Create a project (by owner who has project:manage)
  // ----------------------------------------------------------------
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // ----------------------------------------------------------------
  // Step 7: Assign second member to project with projectRole='project-lead'
  // ----------------------------------------------------------------
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
  // ----------------------------------------------------------------
  // Test: Create task as project lead (should succeed)
  // ----------------------------------------------------------------
  const taskTitle = "Design database schema";
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    projectLeadConnection,
    {
      body: {
        title: taskTitle,
        priority: "urgent",
      },
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task);
  // Verify business logic of the created task
  TestValidator.equals("task title matches", task.title, taskTitle);
  TestValidator.equals("task priority is urgent", task.priority, "urgent");
  TestValidator.equals("task status defaults to open", task.status, "open");
  TestValidator.equals("task assignee is null", task.assignee, null);
  TestValidator.equals("task parent is null", task.parent, null);
  TestValidator.equals("task project matches", task.project.id, project.id);
  TestValidator.predicate(
    "task has at least one history entry",
    task.taskHistories.length > 0,
  );
  // ----------------------------------------------------------------
  // Business Rule Contrast: Plain project member cannot create tasks
  // ----------------------------------------------------------------
  // Join as third member (plain project member)
  const plainMemberConnection: api.IConnection = { host: connection.host };
  const plainMemberAuth = await authorize_member_join(
    plainMemberConnection,
    {},
  );
  typia.assert(plainMemberAuth);
  // Add third member to organization with minimal role
  const plainOrgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: plainMemberAuth.member.id,
          roleId: minimalRole.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(plainOrgMember);
  // Assign third member to project with projectRole='member' (not 'project-lead')
  const plainProjectMembership =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        body: {
          organizationMemberId: plainOrgMember.id,
          projectRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(plainProjectMembership);
  // Plain project member attempts task creation — must be rejected (403)
  await TestValidator.error(
    "plain project member cannot create tasks",
    async () => {
      await generate_random_erp_hrm_member_projects_tasks_create(
        plainMemberConnection,
        {
          body: {
            title: "Unauthorized task attempt",
            priority: "low",
          },
          params: {
            projectId: project.id,
          },
        },
      );
    },
  );
}
