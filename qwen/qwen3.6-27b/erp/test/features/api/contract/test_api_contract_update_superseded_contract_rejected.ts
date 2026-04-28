import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_employee_contract } from "../../../prepare/prepare_random_hrm_platform_employee_contract";

/**
 * Test auto-termination business rule for employee contracts.
 *
 * Validates that when a new employment contract is created for an employee who
 * already has an active contract, the system automatically terminates the previous
 * active contract. The auto-termination sets the `end_date` of the superseded
 * contract to the day before the `start_date` of the new contract.
 *
 * Furthermore, it verifies that attempting to update a superseded contract is
 * rejected with an error, ensuring the immutability of past contracts.
 *
 * 1. Authenticate a member with `employee:manage` permission.
 * 2. Create an employee record in the organization.
 * 3. Create a first active employment contract for the employee (ongoing employment).
 * 4. Create a second contract with a future `start_date` that triggers auto-termination
 *    of the first contract.
 * 5. Attempt to update the first contract and verify the operation is rejected.
 * 6. Validate the auto-termination business rule: the first contract's `end_date` is set
 *    to the day before the second contract's `start_date`.
 */
export async function test_api_contract_update_superseded_contract_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member with employee:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create employee record
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        memberId: member.id,
      },
    },
  );
  typia.assert(employee);
  // 3. Create first active employment contract (ongoing employment, no end_date)
  const firstContractBody: IHrmPlatformEmployeeContract.ICreate = {
    start_date: new Date("2024-01-01T00:00:00.000Z").toISOString(),
    end_date: null,
    pay_rate: 50000,
    pay_period: "monthly",
    working_hours_per_week: 40,
    notes: null,
  };
  const firstContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: firstContractBody,
      },
    );
  typia.assert(firstContract);
  // 4. Create second contract with future start_date that triggers auto-termination
  const secondContractStart = new Date("2024-06-01T00:00:00.000Z");
  const secondContractBody: IHrmPlatformEmployeeContract.ICreate = {
    start_date: secondContractStart.toISOString(),
    end_date: null,
    pay_rate: 60000,
    pay_period: "monthly",
    working_hours_per_week: 40,
    notes: null,
  };
  const secondContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: secondContractBody,
      },
    );
  typia.assert(secondContract);
  // Verify first contract was auto-terminated with end_date set to day before second contract start
  const expectedEndDate = new Date(secondContractStart);
  expectedEndDate.setDate(expectedEndDate.getDate() - 1);
  TestValidator.equals(
    "first contract end_date is day before second contract start_date",
    firstContract.end_date,
    expectedEndDate.toISOString(),
  );
  // 5. Attempt to update the first (superseded) contract - should be rejected
  await TestValidator.error("update superseded contract rejected", async () => {
    await api.functional.hrmPlatform.member.employees.contracts.update(
      memberConnection,
      {
        employeeId: employee.id,
        contractId: firstContract.id,
        body: {
          payRate: 55000,
        } satisfies IHrmPlatformEmployeeContract.IUpdate,
      },
    );
  });
}
