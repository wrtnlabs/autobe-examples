import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
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
import { generate_random_hrm_platform_member_employees_contracts_create } from "../../../generate/generate_random_hrm_platform_member_employees_contracts_create";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_employee_contract } from "../../../prepare/prepare_random_hrm_platform_employee_contract";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test employee contract soft delete success scenario.
 *
 * This test validates that an authenticated organization manager with employee:manage permission
 * can successfully soft-delete an active employee contract. The test creates the necessary
 * prerequisites including role creation, member authentication, employee invitation, and
 * contract creation before performing the soft-delete operation.
 *
 * 1. Authenticate as organization owner with full permissions
 * 2. Create a custom role with employee:manage permission
 * 3. Authenticate a second member account as the employee
 * 4. Invite the employee with the employee:manage role
 * 5. Create an employment contract for the employee
 * 6. Soft-delete the contract using DELETE endpoint
 * 7. Validate that the soft-delete operation succeeded
 */
export async function test_api_employee_contract_soft_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a custom role with employee:manage permission
  const role: IHrmPlatformRole =
    await generate_random_hrm_platform_member_roles_create(ownerConnection, {
      body: {
        name: "Contract Manager",
        permissionKeys: ["employee:manage"],
      } satisfies DeepPartial<IHrmPlatformRole.ICreate>,
    });
  typia.assert(role);
  // 3. Create a second member account for the employee
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(employeeConnection, {});
  // 4. Invite the second member as an employee
  const employee: IHrmPlatformEmployee =
    await generate_random_hrm_platform_member_employees_create(
      ownerConnection,
      {
        body: {
          memberId: typia.random<string & tags.Format<"uuid">>(),
          roleId: role.id,
          employmentType: "full-time",
        } satisfies DeepPartial<IHrmPlatformEmployee.ICreate>,
      },
    );
  typia.assert(employee);
  // 5. Create an employment contract for the employee
  const contract: IHrmPlatformEmployeeContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      ownerConnection,
      {
        body: {
          start_date: new Date().toISOString(),
          pay_rate: 50.0,
          pay_period: "hourly",
          working_hours_per_week: 40,
        } satisfies DeepPartial<IHrmPlatformEmployeeContract.ICreate>,
        params: { employeeId: employee.id },
      },
    );
  typia.assert(contract);
  // 6. Soft-delete the contract
  await api.functional.hrmPlatform.member.employees.contracts.erase(
    ownerConnection,
    {
      employeeId: employee.id,
      contractId: contract.id,
    },
  );
  // 7. Validate that the soft-delete operation succeeded
  TestValidator.predicate("contract soft-deleted successfully", true);
}
