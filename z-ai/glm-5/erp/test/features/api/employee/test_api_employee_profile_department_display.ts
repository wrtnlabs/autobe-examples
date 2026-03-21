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
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";

export async function test_api_employee_profile_department_display(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member (creates organization and employee record)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a department within the organization
  const department = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(department);
  // 3. Get current employee profile to get employee ID
  const employeeBefore =
    await api.functional.erpHrm.member.employees.me.at(memberConnection);
  typia.assert(employeeBefore);
  // Verify department is null before assignment
  TestValidator.equals(
    "department is null before assignment",
    employeeBefore.department,
    null,
  );
  // 4. Update employee to assign to department
  const employeeUpdated = await api.functional.erpHrm.member.employees.update(
    memberConnection,
    {
      employeeId: employeeBefore.id,
      body: {
        departmentId: department.id,
      } satisfies IErpHrmEmployee.IUpdate,
    },
  );
  typia.assert(employeeUpdated);
  // Verify department is assigned in update response
  TestValidator.predicate(
    "department assigned in update response",
    employeeUpdated.department !== null,
  );
  TestValidator.equals(
    "department id matches",
    employeeUpdated.department!.id,
    department.id,
  );
  TestValidator.equals(
    "department name matches",
    employeeUpdated.department!.name,
    department.name,
  );
  // 5. Get employee profile again via GET /employees/me
  const employeeAfter =
    await api.functional.erpHrm.member.employees.me.at(memberConnection);
  typia.assert(employeeAfter);
  // 6. Validate department information is correctly displayed
  TestValidator.predicate(
    "department is not null after assignment",
    employeeAfter.department !== null,
  );
  const empDept = employeeAfter.department!;
  TestValidator.equals("department id is correct", empDept.id, department.id);
  TestValidator.equals(
    "department name is correct",
    empDept.name,
    department.name,
  );
  TestValidator.equals(
    "department description matches",
    empDept.description,
    department.description,
  );
  TestValidator.equals(
    "department parent is null (top-level)",
    empDept.parent,
    null,
  );
  // 7. Validate other employee fields remain correctly populated
  TestValidator.equals(
    "employee id unchanged",
    employeeAfter.id,
    employeeBefore.id,
  );
  TestValidator.equals(
    "member id matches",
    employeeAfter.member.id,
    employeeBefore.member.id,
  );
  TestValidator.equals(
    "member email matches",
    employeeAfter.member.email,
    employeeBefore.member.email,
  );
  TestValidator.equals(
    "organization id matches",
    employeeAfter.organization.id,
    employeeBefore.organization.id,
  );
  TestValidator.equals(
    "role id matches",
    employeeAfter.role.id,
    employeeBefore.role.id,
  );
  TestValidator.equals(
    "employment_type matches",
    employeeAfter.employment_type,
    employeeBefore.employment_type,
  );
  TestValidator.equals(
    "status matches",
    employeeAfter.status,
    employeeBefore.status,
  );
  TestValidator.equals(
    "position matches",
    employeeAfter.position,
    employeeBefore.position,
  );
}
