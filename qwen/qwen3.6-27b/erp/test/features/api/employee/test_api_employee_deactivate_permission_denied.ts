import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
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

// <E2E TEST CODE HERE>
/**
 * Tests that employees with insufficient permissions (lacking employee:manage) are rejected when attempting to deactivate employees.
 *
 * Validates the permission enforcement mechanism on employee deactivation by creating an organization,
 * a custom role with only employee:view, an employee record, and then attempting to deactivate
 * the employee. The request must be rejected with 403 Forbidden error.
 *
 * 1. Authenticates as a member who will become the organization owner.
 * 2. Creates a custom role with only employee:view (no employee:manage).
 * 3. Creates and authenticates a second member who will be an employee to be deactivated.
 * 4. Creates an employee record for the second member using the limited role.
 * 5. Authenticates a third member and assigns them the limited role as an employee.
 * 6. Attempts to deactivate the first employee using the limited operator connection.
 * 7. Verifies the request is rejected with a 403 Forbidden error.
 */
export async function test_api_employee_deactivate_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate first member (Organization Owner)
  const ownerAuthorized = await authorize_member_join(connection, {});
  typia.assert(ownerAuthorized);
  const ownerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: ownerAuthorized.token.access },
  };
  // 2. Create custom role with employee:view only
  const limitedRole = await api.functional.hrmPlatform.member.roles.create(
    ownerConnection,
    {
      body: {
        name: "LimitedViewer",
        permissionKeys: ["employee:view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(limitedRole);
  // 3. Authenticate second member (The target employee to be deactivated)
  const targetEmployeeAuthorized = await authorize_member_join(
    { host: connection.host },
    {},
  );
  typia.assert(targetEmployeeAuthorized);
  // 4. Create employee record for the target member using the limited role
  const targetEmployee =
    await api.functional.hrmPlatform.member.employees.create(ownerConnection, {
      body: {
        memberId: targetEmployeeAuthorized.id,
        roleId: limitedRole.id,
        employmentType: "full-time",
      } satisfies IHrmPlatformEmployee.ICreate,
    });
  typia.assert(targetEmployee);
  // 5. Authenticate a third member to act as the limited operator
  const limitedOperatorAuthorized = await authorize_member_join(
    { host: connection.host },
    {},
  );
  typia.assert(limitedOperatorAuthorized);
  // 6. Assign the limited operator as an employee with the limited role in the same organization
  const limitedOperatorEmployee =
    await api.functional.hrmPlatform.member.employees.create(ownerConnection, {
      body: {
        memberId: limitedOperatorAuthorized.id,
        roleId: limitedRole.id,
        employmentType: "full-time",
      } satisfies IHrmPlatformEmployee.ICreate,
    });
  typia.assert(limitedOperatorEmployee);
  // 7. Create a connection for the limited operator
  const limitedOperatorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: limitedOperatorAuthorized.token.access },
  };
  // 8. Attempt to deactivate the target employee using the limited operator
  await TestValidator.httpError(
    "deactivation denied for insufficient permissions",
    403,
    async () => {
      await api.functional.hrmPlatform.member.employees.erase(
        limitedOperatorConnection,
        {
          employeeId: targetEmployee.id,
        },
      );
    },
  );
}
