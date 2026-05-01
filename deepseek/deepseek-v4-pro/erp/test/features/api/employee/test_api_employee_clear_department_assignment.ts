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
 * Test clearing department assignment from an employee using the update endpoint.
 *
 * Validates that an employee's department assignment can be cleared by setting department_id to null via the update endpoint. The test confirms that the department field in the response becomes null while all other employee attributes — role, position, employment type, and status — remain unchanged. This ensures the nullable department_id field works correctly for removing employees from departmental affiliation without affecting their other organizational attributes.
 *
 * 1. Authenticate as a member who becomes the organization owner with employee:manage permission.
 * 2. Create a custom role to assign to the test employee.
 * 3. Create a department to initially assign and then clear from the employee.
 * 4. Create an employee with the role and department assigned.
 * 5. Update the employee by setting department_id to null.
 * 6. Verify department is null in the response.
 * 7. Verify role, position, employment type, and status are unchanged.
 */
export async function test_api_employee_clear_department_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member (organization owner with all permissions)
  const ownerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(ownerConnection, { body: {} });
  typia.assert(auth);
  // 2. Create a custom role for the employee
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {
    body: {},
  });
  typia.assert(role);
  // 3. Create a department
  const department = await generate_random_erp_hrm_member_departments_create(
    ownerConnection,
    { body: {} },
  );
  typia.assert(department);
  // 4. Create an employee with the department and role assigned
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        erp_hrm_role_id: role.id,
        erp_hrm_department_id: department.id,
      },
    },
  );
  typia.assert(employee);
  // Verify initial state: employee has department assigned
  TestValidator.predicate(
    "initial department assigned",
    employee.department !== null,
  );
  TestValidator.equals(
    "initial department id matches",
    employee.department!.id,
    department.id,
  );
  // Capture initial attributes for comparison after update
  const initialRoleId = employee.role.id;
  const initialPosition = employee.position;
  const initialEmploymentType = employee.employment_type;
  const initialStatus = employee.status;
  // 5. Update employee to clear department assignment
  const updated = await api.functional.erpHrm.member.employees.update(
    ownerConnection,
    {
      employeeId: employee.id,
      body: {
        department_id: null,
      } satisfies IErpHrmEmployee.IUpdate,
    },
  );
  typia.assert(updated);
  // 6. Verify department is cleared
  TestValidator.equals("department cleared to null", updated.department, null);
  // 7. Verify all other attributes remain unchanged
  TestValidator.equals("role unchanged", updated.role.id, initialRoleId);
  TestValidator.equals("position unchanged", updated.position, initialPosition);
  TestValidator.equals(
    "employment type unchanged",
    updated.employment_type,
    initialEmploymentType,
  );
  TestValidator.equals("status unchanged", updated.status, initialStatus);
}
