import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
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
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test project member role demotion from project-lead to member.
 *
 * Validates the symmetry of role transitions within project membership. An employee assigned with the "project-lead" role can be demoted to "member" through the update endpoint, losing elevated task management authority while retaining their original joined_at timestamp.
 *
 * The joined_at field serves as a permanent historical record of when the membership began and must never be modified by role changes. This test confirms both the role update and the immutability of the join date.
 *
 * 1. Authenticate a member via join to obtain organization context.
 * 2. Create a custom role for the employee assignment.
 * 3. Create an active project to which the employee will be assigned.
 * 4. Create an employee within the organization using the custom role.
 * 5. Assign the employee to the project with "project-lead" role.
 * 6. Update the membership role from "project-lead" to "member".
 * 7. Validate the role is now "member" and joined_at unchanged.
 */
export async function test_api_project_member_role_demotion_from_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a role for the employee
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {});
  // 3. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  // 4. Create an employee
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: { erp_hrm_role_id: role.id },
    },
  );
  // 5. Assign employee to project as "project-lead"
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: {
          erp_hrm_employee_id: employee.id,
          role: "project-lead",
        },
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  TestValidator.equals(
    "initial role is project-lead",
    projectMember.role,
    "project-lead",
  );
  // 6. Demote role from "project-lead" to "member"
  const updatedMember =
    await api.functional.erpHrm.member.projects.members.update(
      memberConnection,
      {
        projectId: project.id,
        body: {
          employee_id: employee.id,
          role: "member",
        } satisfies IErpHrmProjectMember.IUpdate,
      },
    );
  typia.assert(updatedMember);
  // 7. Validate role demotion and joined_at immutability
  TestValidator.equals("role demoted to member", updatedMember.role, "member");
  TestValidator.equals(
    "joined_at unchanged after role demotion",
    updatedMember.joined_at,
    projectMember.joined_at,
  );
}
