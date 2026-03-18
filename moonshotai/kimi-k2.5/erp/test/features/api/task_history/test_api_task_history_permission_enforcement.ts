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

/**
 * Test that task history viewing permission is strictly tied to task viewing permissions.
 * Create an organization and project. Create two organization members: one who is assigned
 * to the project as a member, and another who is NOT assigned to the project. Create a task
 * in the project to generate a history entry. As the project member, successfully retrieve
 * the task history. Attempt to retrieve the same task history as the non-project member
 * and verify access is denied with appropriate authorization error.
 */
export async function test_api_task_history_permission_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner connection and authenticate as organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  // 3. Create role for owner with project management permissions
  const ownerRole = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        name: "Project Manager",
        permissions: [
          { permission: "project.manage" },
          { permission: "task.manage" },
        ],
      },
    },
  );
  // 4. Create organization member record for owner to get organization member ID
  const ownerOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: owner.id,
          roleId: ownerRole.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  // 5. Create role for employee
  const employeeRole = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        name: "Employee",
        permissions: [{ permission: "project.view" }],
      },
    },
  );
  // 6. Create employee connection and authenticate
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {});
  // 7. Add employee to organization
  await generate_random_erp_hrm_member_organization_members_create(
    ownerConnection,
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
  // 8. Create project as owner
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  // 9. Assign only owner to project
  await generate_random_erp_hrm_member_projects_members_create(
    ownerConnection,
    {
      params: { projectId: project.id },
      body: {
        organizationMemberId: ownerOrgMember.id,
        role: "project-lead",
      },
    },
  );
  // 10. Create task in project (automatically creates history entry)
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    ownerConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Test Task for History Permission",
      },
    },
  );
  // 11. Extract history ID from task (task creation automatically records history)
  const historyId = task.histories[0].id;
  // 12. Project member (owner) successfully retrieves task history
  const history =
    await api.functional.erpHrm.member.projects.tasks.histories.at(
      ownerConnection,
      {
        projectId: project.id,
        taskId: task.id,
        historyId: historyId,
      },
    );
  typia.assert(history);
  // 13. Non-project member (employee) attempts to retrieve history and fails
  await TestValidator.error(
    "non-project member cannot access task history",
    async () => {
      await api.functional.erpHrm.member.projects.tasks.histories.at(
        employeeConnection,
        {
          projectId: project.id,
          taskId: task.id,
          historyId: historyId,
        },
      );
    },
  );
}
