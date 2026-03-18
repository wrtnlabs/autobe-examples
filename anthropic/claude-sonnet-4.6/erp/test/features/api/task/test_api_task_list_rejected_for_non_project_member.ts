import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTask";
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
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_list_rejected_for_non_project_member(
  connection: api.IConnection,
): Promise<void> {
  // -----------------------------------------------------------------------
  // Step 1: Register manager (org owner) and set up connection
  // -----------------------------------------------------------------------
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {});
  // -----------------------------------------------------------------------
  // Step 2: Create an organization
  // -----------------------------------------------------------------------
  const org = await generate_random_erp_hrm_member_organizations_create(
    managerConnection,
    {},
  );
  typia.assert(org);
  // -----------------------------------------------------------------------
  // Step 3: Switch to the organization context as manager
  // -----------------------------------------------------------------------
  const managerOrgMember =
    await api.functional.erpHrm.member.organizations._switch.switchContext(
      managerConnection,
      { organizationId: org.id },
    );
  typia.assert(managerOrgMember);
  // -----------------------------------------------------------------------
  // Step 4: Create a project (manager has project:manage via Owner role)
  // -----------------------------------------------------------------------
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(project);
  // -----------------------------------------------------------------------
  // Step 5: Create tasks in the project
  // -----------------------------------------------------------------------
  const task1 = await generate_random_erp_hrm_member_projects_tasks_create(
    managerConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_erp_hrm_member_projects_tasks_create(
    managerConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task2);
  // -----------------------------------------------------------------------
  // Step 6: Register a second member (employee)
  // Capture the auth result to get the second member's UUID
  // -----------------------------------------------------------------------
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  typia.assert(employeeAuth);
  // -----------------------------------------------------------------------
  // Step 7: Add second member to org using owner role ID
  // (Owner role is the only role ID retrievable without a role listing API)
  // The second member will NOT be added to the project as a project member.
  // -----------------------------------------------------------------------
  const ownerRoleId = org.owner.role.id;
  const employeeOrgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      managerConnection,
      {
        body: {
          memberId: employeeAuth.member.id,
          roleId: ownerRoleId,
          employmentType: "full-time",
        },
        params: { organizationId: org.id },
      },
    );
  typia.assert(employeeOrgMember);
  // -----------------------------------------------------------------------
  // Access Denial Scenario:
  // The second member does NOT switch to the org context.
  // Without an active org context in their session, they have no org scope.
  // Attempting to list tasks in the project must be rejected with 403.
  //
  // This validates: being a registered platform member with org membership
  // is NOT sufficient to access project tasks without the org session context
  // and explicit project membership (or project:manage permission + org context).
  // -----------------------------------------------------------------------
  await TestValidator.httpError(
    "non-project-member without org context cannot list project tasks",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.tasks.index(
        employeeConnection,
        {
          projectId: project.id,
          body: {} satisfies IErpHrmTask.IRequest,
        },
      );
    },
  );
  // -----------------------------------------------------------------------
  // Boundary Validation:
  // The manager (owner with project:manage and active org context) CAN list
  // the project tasks. This confirms tasks exist and the 403 above is
  // strictly due to missing org context / project membership.
  // -----------------------------------------------------------------------
  const taskList = await api.functional.erpHrm.member.projects.tasks.index(
    managerConnection,
    {
      projectId: project.id,
      body: {} satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(taskList);
  TestValidator.predicate(
    "manager can see project tasks",
    taskList.pagination.records >= 1,
  );
}
