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

export async function test_api_task_delete_permission_denied_for_regular_member(
  connection: api.IConnection,
): Promise<void> {
  // Create manager connection and authenticate
  const managerConnection: api.IConnection = { host: connection.host };
  const managerUser = await authorize_member_join(managerConnection, {
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
  typia.assert(managerUser);
  // Create regular member connection and authenticate
  const regularConnection: api.IConnection = { host: connection.host };
  const regularUser = await authorize_member_join(regularConnection, {
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
  typia.assert(regularUser);
  // Create organization as manager
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
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
  // Create custom role with project management permission for manager
  const managerRole = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: "Project Manager",
        description: "Role with project management permissions",
        permissions: [
          { permission: "project:manage" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(managerRole);
  // Create manager organization member with that role
  const managerOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: managerUser.id,
          roleId: managerRole.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(managerOrgMember);
  // Create role for regular member without project management permission
  const regularRole = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: "Regular Employee",
        description: "Role without project management permissions",
        permissions: [] satisfies IErpHrmRolePermission.ICreate[],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(regularRole);
  // Create regular member organization member without that permission
  const regularOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: regularUser.id,
          roleId: regularRole.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(regularOrgMember);
  // Create project as container for tasks
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // Assign manager as project-lead to create tasks
  const managerProjectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: managerOrgMember.id,
          role: "project-lead",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(managerProjectMember);
  // Add regular member to project as regular member (not project-lead)
  const regularProjectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: regularOrgMember.id,
          role: "member",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(regularProjectMember);
  // Create task that will be targeted for deletion attempt
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    managerConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.name(5),
        status: "Open",
        priority: "Medium",
      } satisfies IErpHrmTask.ICreate,
    },
  );
  typia.assert(task);
  // Attempt to delete the task as regular member - should fail with 403
  await TestValidator.httpError(
    "regular member cannot delete tasks",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.tasks.erase(
        regularConnection,
        {
          projectId: project.id,
          taskId: task.id,
        },
      );
    },
  );
}
