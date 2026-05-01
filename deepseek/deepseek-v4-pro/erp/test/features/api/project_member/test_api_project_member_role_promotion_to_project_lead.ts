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
 * Test project member role promotion from "member" to "project-lead".
 *
 * Validates that an employee who is already a project member with the "member" role can be successfully promoted to "project-lead" through the update endpoint. The promotion grants the member elevated task management authority within the project while preserving their original assignment record.
 *
 * Special attention is given to verifying that the joined_at timestamp remains immutable — it must retain the original assignment date regardless of subsequent role changes. The complete response payload is validated for correctness: the updated role, the preserved joined_at timestamp, and the full membership details including the employee and project summary relations.
 *
 * 1. Member account is created and authenticated via join.
 * 2. A custom role is created for the employee invitation.
 * 3. An employee is created with the custom role.
 * 4. A project is created for the member assignment.
 * 5. The employee is assigned to the project as a "member".
 * 6. The membership is updated to "project-lead".
 * 7. Validation confirms the role changed to "project-lead" and joined_at remains unchanged.
 */
export async function test_api_project_member_role_promotion_to_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member (owner of new organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a custom role for the employee
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {});
  typia.assert(role);
  // 3. Create an employee with the created role
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    { body: { erp_hrm_role_id: role.id } },
  );
  typia.assert(employee);
  // 4. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Assign the employee to the project with the initial "member" role
  const membership =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: {
          erp_hrm_employee_id: employee.id,
          role: "member",
        },
        params: { projectId: project.id },
      },
    );
  typia.assert(membership);
  const originalJoinedAt = membership.joined_at;
  // 6. Promote the member to "project-lead"
  const updated = await api.functional.erpHrm.member.projects.members.update(
    memberConnection,
    {
      projectId: project.id,
      body: {
        employee_id: employee.id,
        role: "project-lead",
      } satisfies IErpHrmProjectMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 7. Validate the promotion
  TestValidator.equals(
    "role promoted to project-lead",
    updated.role,
    "project-lead",
  );
  TestValidator.equals(
    "joined_at timestamp preserved after promotion",
    updated.joined_at,
    originalJoinedAt,
  );
}
