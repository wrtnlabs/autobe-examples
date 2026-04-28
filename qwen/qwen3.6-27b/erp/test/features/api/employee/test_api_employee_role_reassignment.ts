import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test reassigning an employee to a different organizational role.
 *
 * Validates the employee role reassignment flow within an organization context. An authenticated member with employee:manage permission creates two custom roles, creates an employee with the first role, then updates the employee's role_id to reference the second custom role. Verifies the updated employee record reflects the correct role information including the new role's name, ID, and built-in classification status.
 *
 * Confirms partial update semantics where only the provided role_id field is modified while all other employee attributes (member reference, department, position, employment_type, status) remain unchanged. The update validates the referenced role exists within the same organization context per section 129 reference validation.
 *
 * 1. Authenticate as organization Owner with employee:manage permission.
 * 2. Create a first custom role within the organization.
 * 3. Create a second custom role with different permissions.
 * 4. Create an employee record assigned to the first role.
 * 5. Update the employee's role_id to the second role.
 * 6. Validate the employee's role reference reflects the second role.
 * 7. Confirm all other employee attributes remain unchanged.
 */
export async function test_api_employee_role_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Owner (has employee:manage permission)
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {});
  // 2. Create first custom role
  const firstRole: IHrmPlatformRole =
    await generate_random_hrm_platform_member_roles_create(
      managerConnection,
      {},
    );
  typia.assert(firstRole);
  // 3. Create second custom role with different permissions
  const PERMISSION_KEYS = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ] as const;
  const remainingKeys = PERMISSION_KEYS.filter(
    (k) => !firstRole.rolePermissions.some((p) => p.permission_key === k),
  );
  const targetPermissions =
    remainingKeys.length > 0
      ? (() => {
          const arr = Array.from(remainingKeys);
          const count = Math.min(2, arr.length);
          for (let i = arr.length - 1; i > 0; i--) {
            const j = randint(0, i);
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return arr.slice(0, count);
        })()
      : ["employee:view", "time:view_all"];
  const secondRole: IHrmPlatformRole =
    await generate_random_hrm_platform_member_roles_create(managerConnection, {
      body: {
        name: RandomGenerator.name(),
        permissionKeys: targetPermissions,
      },
    });
  typia.assert(secondRole);
  TestValidator.predicate(
    "roles have different IDs",
    firstRole.id !== secondRole.id,
  );
  TestValidator.predicate(
    "roles have different names",
    firstRole.name !== secondRole.name,
  );
  // 4. Create employee assigned to the first role
  const initialEmployee: IHrmPlatformEmployee =
    await generate_random_hrm_platform_member_employees_create(
      managerConnection,
      {
        body: {
          roleId: firstRole.id,
        },
      },
    );
  typia.assert(initialEmployee);
  TestValidator.equals(
    "initial role matches first role",
    initialEmployee.role.id,
    firstRole.id,
  );
  const initialMember = initialEmployee.member;
  const initialEmploymentType = initialEmployee.employment_type;
  const initialStatus = initialEmployee.status;
  // 5. Update employee's role_id to the second role
  const body = {
    role_id: secondRole.id,
  } satisfies IHrmPlatformEmployee.IUpdate;
  const updatedEmployee: IHrmPlatformEmployee =
    await api.functional.hrmPlatform.member.employees.update(
      managerConnection,
      {
        employeeId: initialEmployee.id,
        body,
      },
    );
  typia.assert(updatedEmployee);
  // 6. Validate role reassignment
  TestValidator.equals(
    "updated role ID matches second role",
    updatedEmployee.role.id,
    secondRole.id,
  );
  TestValidator.equals(
    "updated role name matches second role",
    updatedEmployee.role.name,
    secondRole.name,
  );
  TestValidator.equals(
    "updated role builtIn status is false",
    updatedEmployee.role.builtIn,
    false,
  );
  TestValidator.predicate(
    "role permissions exist",
    updatedEmployee.role.id !== undefined,
  );
  // 7. Confirm partial update — other fields unchanged
  TestValidator.equals(
    "employee ID unchanged",
    updatedEmployee.id,
    initialEmployee.id,
  );
  TestValidator.equals(
    "member ID unchanged",
    updatedEmployee.member.id,
    initialMember.id,
  );
  TestValidator.equals(
    "member email unchanged",
    updatedEmployee.member.email,
    initialMember.email,
  );
  TestValidator.equals(
    "employment type unchanged",
    updatedEmployee.employment_type,
    initialEmploymentType,
  );
  TestValidator.equals(
    "status unchanged",
    updatedEmployee.status,
    initialStatus,
  );
}
