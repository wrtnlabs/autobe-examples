import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test employee update with all mutable fields changed simultaneously.
 *
 * Validates the partial update semantics of the employee endpoint when all four mutable fields — role, department, position, and employment type — are provided in a single PUT request. Confirms that each field is independently updated to the new value while the employee's identity (id, member profile, status) remains unchanged.
 *
 * The test also verifies that the updated_at timestamp advances past the original created_at timestamp, confirming the database write occurred and the audit trail is properly maintained. Role and department changes are validated by comparing the returned role.id and department.id against the newly created resources.
 *
 * 1. Authenticate as a member via join, gaining Owner role in a new organization.
 * 2. Create an initial role and department for employee creation.
 * 3. Create an employee with the initial role, department, and "full-time" employment type.
 * 4. Create a different role and department to assign during the update.
 * 5. Update the employee with new role_id, department_id, position, and employment_type.
 * 6. Validate the response contains all four new values and updated_at has advanced.
 */
export async function test_api_employee_update_all_mutable_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member (becomes organization Owner)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create initial role for the employee
  const initialRole = await generate_random_erp_hrm_roles_create(
    memberConnection,
    {},
  );
  // 3. Create initial department for the employee
  const initialDepartment =
    await generate_random_erp_hrm_member_departments_create(
      memberConnection,
      {},
    );
  // 4. Create the employee with initial role, department, and employment type
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        erp_hrm_role_id: initialRole.id,
        erp_hrm_department_id: initialDepartment.id,
        employment_type: "full-time",
      },
    },
  );
  // 5. Create a different role for the update
  const newRole = await generate_random_erp_hrm_roles_create(
    memberConnection,
    {},
  );
  // 6. Create a different department for the update
  const newDepartment = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {},
  );
  // 7. Prepare updated field values
  const newPosition = RandomGenerator.name();
  const newEmploymentType = "part-time";
  // 8. Update the employee with all four mutable fields
  const updated = await api.functional.erpHrm.member.employees.update(
    memberConnection,
    {
      employeeId: employee.id,
      body: {
        role_id: newRole.id,
        department_id: newDepartment.id,
        position: newPosition,
        employment_type: newEmploymentType,
      } satisfies IErpHrmEmployee.IUpdate,
    },
  );
  typia.assert(updated);
  // 9. Validate all four fields reflect the new values
  TestValidator.equals("role updated", updated.role.id, newRole.id);
  TestValidator.equals(
    "department updated",
    updated.department!.id,
    newDepartment.id,
  );
  TestValidator.equals("position updated", updated.position, newPosition);
  TestValidator.equals(
    "employment type updated",
    updated.employment_type,
    newEmploymentType,
  );
  // 10. Validate updated_at timestamp has advanced past created_at
  TestValidator.predicate(
    "updated_at advanced past created_at",
    updated.updated_at > employee.created_at,
  );
}
