import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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
 * Test employee department reassignment via partial update.
 *
 * Validates that an authenticated member with employee:manage permission can update an employee's department assignment using partial update semantics. When only the department_id is provided in the update request body, all other employee fields (role, position, employment_type, status) must remain unchanged from their original values.
 *
 * Special attention is given to verifying that the department_id reference is correctly maintained and that partial update semantics ensure only the provided field is modified while all other mutable fields preserve their original values.
 *
 * 1. Manager member joins the platform and receives authorization.
 * 2. New department is created within the organization.
 * 3. Employee record is created within the organization.
 * 4. Employee is updated via partial update with only department_id specified.
 * 5. Validates the updated employee record reflects the new department assignment.
 * 6. Confirms remaining employee fields (role, position, employment_type, status) remain unchanged.
 */
export async function test_api_employee_department_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager joins and is auto-authenticated with employee:manage permission
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuthorized = await authorize_member_join(managerConnection, {});
  typia.assert(managerAuthorized);
  // 2. Create department within the organization
  const department =
    await generate_random_hrm_platform_member_departments_create(
      managerConnection,
      {},
    );
  typia.assert(department);
  // 3. Create employee record
  const originalEmployee =
    await generate_random_hrm_platform_member_employees_create(
      managerConnection,
      {},
    );
  typia.assert(originalEmployee);
  // Capture original values to verify partial update semantics
  const originalPosition = originalEmployee.position;
  const originalEmploymentType = originalEmployee.employment_type;
  const originalStatus = originalEmployee.status;
  const originalRoleId = originalEmployee.role.id;
  const originalUpdatedAt = originalEmployee.updated_at;
  // 4. Update employee with only department_id - partial update semantics
  const updateBody = {
    department_id: department.id,
  } satisfies IHrmPlatformEmployee.IUpdate;
  const updatedEmployee =
    await api.functional.hrmPlatform.member.employees.update(
      managerConnection,
      {
        employeeId: originalEmployee.id,
        body: updateBody,
      },
    );
  typia.assert(updatedEmployee);
  // 5. Validate department assignment updated correctly
  TestValidator.equals(
    "department assigned correctly",
    updatedEmployee.department?.id,
    department.id,
  );
  // 6. Validate partial update semantics - other fields unchanged
  TestValidator.equals(
    "position unchanged",
    updatedEmployee.position,
    originalPosition,
  );
  TestValidator.equals(
    "employment_type unchanged",
    updatedEmployee.employment_type,
    originalEmploymentType,
  );
  TestValidator.equals(
    "status unchanged",
    updatedEmployee.status,
    originalStatus,
  );
  TestValidator.equals(
    "role unchanged",
    updatedEmployee.role.id,
    originalRoleId,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedEmployee.updated_at,
    originalUpdatedAt,
  );
}
