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

export async function test_api_employee_department_unassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a department within the organization
  const department = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(department);
  // 3. Create an employee assigned to that department
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        departmentId: department.id,
      },
    },
  );
  typia.assert(employee);
  // Verify employee has department assigned
  TestValidator.equals(
    "employee department assigned before update",
    employee.department?.id,
    department.id,
  );
  // 4. Update employee to remove department assignment
  const updatedEmployee = await api.functional.erpHrm.member.employees.update(
    memberConnection,
    {
      employeeId: employee.id,
      body: {
        departmentId: null,
      } satisfies IErpHrmEmployee.IUpdate,
    },
  );
  typia.assert(updatedEmployee);
  // 5. Verify department is null after unassignment
  TestValidator.equals(
    "department is null after update",
    updatedEmployee.department,
    null,
  );
  // 6. Verify other fields are preserved
  TestValidator.equals(
    "employee id preserved",
    updatedEmployee.id,
    employee.id,
  );
  TestValidator.equals(
    "employee status preserved",
    updatedEmployee.status,
    employee.status,
  );
  TestValidator.equals(
    "employee employment type preserved",
    updatedEmployee.employment_type,
    employee.employment_type,
  );
}
