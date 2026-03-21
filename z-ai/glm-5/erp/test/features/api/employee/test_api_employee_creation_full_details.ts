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
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_employee_creation_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (organization owner with employee management permission)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: IErpHrmMember.IAuthorized = await authorize_member_join(
    ownerConnection,
    {},
  );
  typia.assert(owner);
  // 2. Create custom role with employee:manage permission
  const role: IErpHrmRole = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["employee:manage", "employee:view"],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Create department
  const department: IErpHrmDepartment =
    await generate_random_erp_hrm_member_departments_create(ownerConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(department);
  // 4. Create second member (will become employee)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeMember: IErpHrmMember.IAuthorized = await authorize_member_join(
    employeeConnection,
    {},
  );
  typia.assert(employeeMember);
  // 5. Create employee with full details using owner connection
  const employee: IErpHrmEmployee =
    await api.functional.erpHrm.member.employees.create(ownerConnection, {
      body: {
        email: employeeMember.email,
        roleId: role.id,
        departmentId: department.id,
        position: "Software Engineer",
        employmentType: "full_time",
      } satisfies IErpHrmEmployee.ICreate,
    });
  typia.assert(employee);
  // 6. Validate employee member information
  TestValidator.equals(
    "employee member email",
    employee.member.email,
    employeeMember.email,
  );
  TestValidator.equals(
    "employee member id",
    employee.member.id,
    employeeMember.id,
  );
  // 7. Validate role assignment
  TestValidator.equals("employee role id", employee.role.id, role.id);
  TestValidator.equals("employee role name", employee.role.name, role.name);
  // 8. Validate department assignment
  TestValidator.equals(
    "employee department id",
    employee.department!.id,
    department.id,
  );
  TestValidator.equals(
    "employee department name",
    employee.department!.name,
    department.name,
  );
  // 9. Validate other fields
  TestValidator.equals(
    "employee position",
    employee.position,
    "Software Engineer",
  );
  TestValidator.equals(
    "employee employment type",
    employee.employment_type,
    "full_time",
  );
  TestValidator.equals("employee status", employee.status, "active");
  // 10. Validate organization context - organization should be the owner's organization
  TestValidator.predicate(
    "employee has organization",
    employee.organization.id !== null && employee.organization.id !== undefined,
  );
}