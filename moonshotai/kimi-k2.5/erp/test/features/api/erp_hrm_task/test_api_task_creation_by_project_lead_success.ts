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

export async function test_api_task_creation_by_project_lead_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
    },
  });
  typia.assert(owner);
  // Step 2: Create an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(ownerConnection, {
      body: {
        name: RandomGenerator.name(2),
        currency: "USD",
        timezone: "America/New_York",
        fiscal_year_start_month: 1,
      },
    });
  typia.assert(organization);
  // Step 3: Create a custom role with project management permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        permissions: [{ permission: "project.manage" }],
      },
    },
  );
  typia.assert(role);
  // Step 4: Create a project lead user and assign as organization member
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLeadUser = await authorize_member_join(projectLeadConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
    },
  });
  typia.assert(projectLeadUser);
  const projectLeadOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: projectLeadUser.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  typia.assert(projectLeadOrgMember);
  // Step 5: Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
      },
    },
  );
  typia.assert(project);
  // Step 6: Assign the member as project lead
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          organizationMemberId: projectLeadOrgMember.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(projectMember);
  // Step 7: Create a task with all optional fields as project lead
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    projectLeadConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "Open",
        priority: "High",
        due_date: futureDate.toISOString(),
        estimated_hours: 8,
        assigned_to_id: projectLeadOrgMember.id,
      },
    },
  );
  typia.assert(task);
  // Step 8: Verify task creation response
  TestValidator.equals(
    "task belongs to correct project",
    task.project.id,
    project.id,
  );
  TestValidator.equals("task has Open status", task.status, "Open");
  TestValidator.equals("task has High priority", task.priority, "High");
  TestValidator.predicate("task has generated UUID", () => !!task.id);
  TestValidator.predicate(
    "task has createdAt timestamp",
    () => !!task.createdAt,
  );
  TestValidator.predicate(
    "task has updatedAt timestamp",
    () => !!task.updatedAt,
  );
  TestValidator.predicate(
    "task history entry automatically created",
    () => task.histories.length > 0,
  );
  TestValidator.equals(
    "task assignee matches",
    task.assignee?.id,
    projectLeadOrgMember.id,
  );
}
