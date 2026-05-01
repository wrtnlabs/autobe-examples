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
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test employee role change to a different valid role within the same organization.
 *
 * Verifies that an Owner (who holds the employee:manage permission) can successfully
 * reassign an employee from one custom role to another. The test validates that the
 * returned employee record reflects the new role assignment while preserving all other
 * fields, and that the updated_at timestamp advances to indicate the modification was
 * applied.
 *
 * 1. Owner authenticates via member join (auto-creates organization with Owner role).
 * 2. Owner creates a first custom role ("Engineer") to serve as the employee's initial role.
 * 3. Owner invites an employee assigned to the first role.
 * 4. Owner creates a second custom role ("Manager") as the target role for reassignment.
 * 5. Owner changes the employee's role from the first role to the second role.
 * 6. Validates that the employee's role ID and name now reflect the second role.
 * 7. Validates that all other employee fields remain unchanged.
 * 8. Validates that updated_at is more recent than before the role change.
 */
export async function test_api_employee_role_change_to_different_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Owner (join creates organization, Owner role, and sets auth headers)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create the initial role ("Engineer")
  const initialRole = await generate_random_erp_hrm_roles_create(
    ownerConnection,
    {
      body: {
        name: "Engineer",
      },
    },
  );
  typia.assert(initialRole);
  // 3. Invite an employee assigned to the initial role
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        erp_hrm_role_id: initialRole.id,
      },
    },
  );
  typia.assert(employee);
  // Capture updated_at before role change
  const updatedAtBefore = new Date(employee.updated_at).getTime();
  // 4. Create the second role ("Manager") as the target role
  const secondRole = await generate_random_erp_hrm_roles_create(
    ownerConnection,
    {
      body: {
        name: "Manager",
      },
    },
  );
  typia.assert(secondRole);
  // 5. Change the employee's role from initial role to second role
  const updatedEmployee =
    await api.functional.erpHrm.member.employees.role.update(ownerConnection, {
      employeeId: employee.id,
      body: {
        erp_hrm_role_id: secondRole.id,
      } satisfies IErpHrmEmployee.IUpdateRole,
    });
  typia.assert(updatedEmployee);
  // 6. Validate role changed to second role
  TestValidator.equals(
    "role id matches second role",
    updatedEmployee.role.id,
    secondRole.id,
  );
  TestValidator.equals(
    "role name matches second role",
    updatedEmployee.role.name,
    secondRole.name,
  );
  // 7. Validate all other fields remain unchanged (except role and updated_at)
  TestValidator.equals(
    "employee fields unchanged except role and updated_at",
    employee,
    updatedEmployee,
    (key) => key === "role" || key === "updated_at",
  );
  // 8. Validate updated_at is more recent
  const updatedAtAfter = new Date(updatedEmployee.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is more recent after role change",
    updatedAtAfter > updatedAtBefore,
  );
}
