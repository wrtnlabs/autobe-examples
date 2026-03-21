import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

export async function test_api_employee_department_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // 2. Create department for assignment
  const department = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {},
  );
  typia.assert(department);
  // 3. Create employee without department assignment
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        departmentId: null,
      },
    },
  );
  typia.assert(employee);
  // Verify employee initially has no department
  TestValidator.equals(
    "employee has no department initially",
    employee.department,
    null,
  );
  // Store original values for comparison
  const originalPosition = employee.position;
  const originalEmploymentType = employee.employment_type;
  const originalRoleId = employee.role.id;
  // 4. Update employee to assign department
  const updatedEmployee = await api.functional.erpHrm.member.employees.update(
    memberConnection,
    {
      employeeId: employee.id,
      body: {
        departmentId: department.id,
      } satisfies IErpHrmEmployee.IUpdate,
    },
  );
  typia.assert(updatedEmployee);
  // 5. Validate department assignment
  TestValidator.predicate(
    "employee has department assigned",
    updatedEmployee.department !== null,
  );
  TestValidator.equals(
    "department id matches",
    updatedEmployee.department!.id,
    department.id,
  );
  TestValidator.equals(
    "department name matches",
    updatedEmployee.department!.name,
    department.name,
  );
  // 6. Verify other fields remain intact
  TestValidator.equals(
    "position unchanged",
    updatedEmployee.position,
    originalPosition,
  );
  TestValidator.equals(
    "employment type unchanged",
    updatedEmployee.employment_type,
    originalEmploymentType,
  );
  TestValidator.equals(
    "role unchanged",
    updatedEmployee.role.id,
    originalRoleId,
  );
}
