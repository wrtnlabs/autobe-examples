import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_member_role_demotion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a manager with project:manage permission (owner has this by default)
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {});
  typia.assert(managerAuth);
  // Step 2: Create a project within the manager's organization
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(project);
  // Step 3: Create another member who will be added to the project as team member
  const teamMemberConnection: api.IConnection = { host: connection.host };
  const teamMemberAuth = await authorize_member_join(teamMemberConnection, {});
  typia.assert(teamMemberAuth);
  // Step 4: Create an employee record for the team member in manager's organization
  const employee = await generate_random_erp_hrm_member_employees_create(
    managerConnection,
    {
      body: {
        email: teamMemberAuth.email,
      },
    },
  );
  typia.assert(employee);
  // Step 5: Add the employee to the project with 'project_lead' role
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employee.id,
          role: "project_lead",
        },
      },
    );
  typia.assert(projectMember);
  // Verify initial role is 'project_lead'
  TestValidator.equals(
    "initial role is project_lead",
    projectMember.role,
    "project_lead",
  );
  // Store original updated_at timestamp for comparison
  const originalUpdatedAt = projectMember.updated_at;
  // Step 6: Demote the project lead to regular member role
  const updatedProjectMember =
    await api.functional.erpHrm.member.projects.members.update(
      managerConnection,
      {
        projectId: project.id,
        projectMemberId: projectMember.id,
        body: { role: "member" } satisfies IErpHrmProjectMember.IUpdate,
      },
    );
  typia.assert(updatedProjectMember);
  // Step 7: Verify the role demotion
  TestValidator.equals(
    "role demoted to member",
    updatedProjectMember.role,
    "member",
  );
  // Step 8: Verify updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at timestamp changed after update",
    updatedProjectMember.updated_at,
    originalUpdatedAt,
  );
  // Step 9: Verify employee relation remains intact
  TestValidator.equals(
    "employee relation preserved",
    updatedProjectMember.employee.id,
    employee.id,
  );
  // Step 10: Verify project relation remains intact
  TestValidator.equals(
    "project relation preserved",
    updatedProjectMember.project.id,
    project.id,
  );
}
