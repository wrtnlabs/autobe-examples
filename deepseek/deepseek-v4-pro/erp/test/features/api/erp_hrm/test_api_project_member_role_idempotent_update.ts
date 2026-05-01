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
 * Test idempotent behavior when updating a project member's role to the same value.
 *
 * Verifies that updating a project member's role to the role they already hold succeeds without error and returns the unchanged membership record. This confirms the operation handles no-op updates gracefully rather than rejecting them.
 *
 * The test validates that the `joined_at` timestamp and all other fields in the response remain identical to the pre-update state, confirming the update was truly idempotent. Per the API specification, setting the same role as the current assignment is explicitly allowed and returns the record with original timestamps preserved.
 *
 * 1. Member registers and authenticates to access project management endpoints.
 * 2. A custom role is created to assign to the new employee.
 * 3. An active project is created for membership assignment.
 * 4. An employee is created and invited to the organization.
 * 5. The employee is assigned to the project with the "member" role.
 * 6. The membership role is updated to the same "member" value.
 * 7. Validates the idempotent update returned the unchanged record with all fields intact.
 */
export async function test_api_project_member_role_idempotent_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a custom role
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {});
  typia.assert(role);
  // 3. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Create an employee
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employee);
  // 5. Assign the employee to the project with "member" role
  const membership =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: {
          erp_hrm_employee_id: employee.id,
          role: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(membership);
  // 6. Update the membership with the same "member" role (idempotent operation)
  const updated = await api.functional.erpHrm.member.projects.members.update(
    memberConnection,
    {
      projectId: project.id,
      body: {
        employee_id: employee.id,
        role: "member",
      } satisfies IErpHrmProjectMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 7. Validate idempotent behavior — all fields should remain unchanged
  TestValidator.equals(
    "idempotent update preserves id",
    updated.id,
    membership.id,
  );
  TestValidator.equals(
    "idempotent update preserves role",
    updated.role,
    "member",
  );
  TestValidator.equals(
    "idempotent update preserves joined_at",
    updated.joined_at,
    membership.joined_at,
  );
  TestValidator.equals(
    "idempotent update preserves created_at",
    updated.created_at,
    membership.created_at,
  );
  TestValidator.equals(
    "idempotent update preserves updated_at",
    updated.updated_at,
    membership.updated_at,
  );
  TestValidator.equals(
    "idempotent update preserves employee id",
    updated.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "idempotent update preserves project id",
    updated.project.id,
    project.id,
  );
}
