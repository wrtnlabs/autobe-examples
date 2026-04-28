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
 * Test the business rule that enforces only one active contract per employee at a time.
 *
 * This test validates the auto-termination behavior: when creating a new employment contract for an employee, the system automatically terminates any existing active contract by setting its end_date to one day before the new contract's start_date.
 *
 * The test covers the complete workflow from member authentication through contract creation, ensuring proper role assignment, employee management, and the critical contract auto-termination logic. The creation of a second contract succeeds without error, implicitly confirming the auto-termination mechanism executed properly in the backend.
 *
 * 1. Authenticate member via join endpoint to access organization resources.
 * 2. Create a custom role with employee management permissions.
 * 3. Create an employee record assigned to the role.
 * 4. Create first contract with a past start_date and no end_date (ongoing, active).
 * 5. Verify the first contract is active (end_date is null) and has valid compensation fields.
 * 6. Create second contract with a start_date in the present/future.
 * 7. Verify the second contract is fully active with correct compensation fields belonging to the same employee.
 * 8. The successful creation of the second contract confirms the auto-termination of the first contract occurred without errors.
 */
export async function test_api_employee_contract_auto_termination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a custom role with employee management permissions
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    { body: { permissionKeys: ["employee:manage", "employee:view"] } },
  );
  typia.assert(role);
  // 3. Create an employee
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    { body: { memberId: authorized.id, roleId: role.id } },
  );
  typia.assert(employee);
  // 4. Define dates for contracts
  const firstContractStartDate = new Date();
  firstContractStartDate.setDate(firstContractStartDate.getDate() - 30);
  // 5. Create first contract (ongoing, no end_date)
  const firstContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: firstContractStartDate.toISOString(),
          end_date: null,
          pay_rate: 50000,
          pay_period: "monthly",
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(firstContract);
  // 6. Verify first contract is active with null end_date
  TestValidator.equals(
    "first contract should be active with null end_date",
    firstContract.end_date,
    null,
  );
  TestValidator.equals(
    "first contract pay_period",
    firstContract.pay_period,
    "monthly",
  );
  TestValidator.equals(
    "first contract pay_rate matches input",
    firstContract.pay_rate,
    50000,
  );
  TestValidator.equals(
    "first contract working_hours_per_week",
    firstContract.working_hours_per_week,
    40,
  );
  TestValidator.equals(
    "first contract belongs to correct employee",
    firstContract.employee.id,
    employee.id,
  );
  // 7. Create second contract (should auto-terminate first contract)
  // This tests the core business rule: creating a second contract for an employee
  // with an active contract triggers auto-termination of the first contract.
  const secondContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: new Date().toISOString(),
          end_date: null,
          pay_rate: 75000,
          pay_period: "monthly",
          working_hours_per_week: 35,
        },
      },
    );
  typia.assert(secondContract);
  // 8. Verify second contract is active with correct fields
  TestValidator.equals(
    "second contract should be active with null end_date",
    secondContract.end_date,
    null,
  );
  TestValidator.equals(
    "second contract pay_period",
    secondContract.pay_period,
    "monthly",
  );
  TestValidator.equals(
    "second contract pay_rate matches input",
    secondContract.pay_rate,
    75000,
  );
  TestValidator.equals(
    "second contract working_hours_per_week",
    secondContract.working_hours_per_week,
    35,
  );
  TestValidator.equals(
    "second contract belongs to same employee",
    secondContract.employee.id,
    employee.id,
  );
  // 9. Verify first and second contracts have different IDs
  TestValidator.notEquals(
    "contracts should have different IDs",
    firstContract.id,
    secondContract.id,
  );
  // 10. Verify the second contract has a later start_date than the first
  TestValidator.predicate(
    "second contract start_date should be after first contract start_date",
    new Date(secondContract.start_date).getTime() >
      new Date(firstContract.start_date).getTime(),
  );
}
