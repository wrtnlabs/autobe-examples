import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_departments_create } from "../../../generate/generate_random_hrm_platform_member_departments_create";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";

/**
 * Verify employee listing filters correctly by department assignment.
 *
 * Validates that filtering employees by department_id returns only employees assigned to that specific department. Creates two employees: one assigned to 'Engineering' department and one without any department assignment, then performs a filtered query to ensure proper isolation of department-scoped employee records.
 *
 * 1. Authenticates as a member, creating an organization context with JWT tokens for subsequent API operations.
 * 2. Creates an 'Engineering' department within the authenticated organization.
 * 3. Creates Employee 1 assigned to the 'Engineering' department.
 * 4. Creates Employee 2 without any department assignment (departmentId is undefined).
 * 5. Filters employees using the Engineering department ID.
 * 6. Validates the filtered response includes Employee 1.
 * 7. Validates the filtered response excludes Employee 2.
 */
export async function test_api_employee_list_filter_by_department(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a department named 'Engineering'
  const department =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Engineering",
        },
      },
    );
  typia.assert(department);
  // 3. Create an employee assigned to 'Engineering' department
  const assignedEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      {
        body: {
          departmentId: department.id,
        },
      },
    );
  typia.assert(assignedEmployee);
  // 4. Create an employee with no department assignment
  const unassignedEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      {},
    );
  typia.assert(unassignedEmployee);
  // 5. Filter employees by the Engineering department
  const result = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        department_id: department.id,
      },
    },
  );
  typia.assert(result);
  // 6. Validate response contains the assigned employee
  TestValidator.equals(
    "response includes assigned employee",
    result.data.some((emp) => emp.id === assignedEmployee.id),
    true,
  );
  // 7. Validate response excludes the unassigned employee
  TestValidator.equals(
    "response excludes unassigned employee",
    result.data.some((emp) => emp.id === unassignedEmployee.id),
    false,
  );
}
