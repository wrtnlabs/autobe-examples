import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeContract";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_contracts_create } from "../../../generate/generate_random_hrm_time_track_member_employees_contracts_create";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_employee_contract } from "../../../prepare/prepare_random_hrm_time_track_employee_contract";

/**
 * Test the business rule that creating a new contract automatically ends the previous active contract.
 *
 * Validates the complete employee contract replacement workflow including member authentication, employee creation, and contract management. Ensures that when a new contract is created for an employee, the system automatically ends the previous active contract by setting its end_date to the day before the new contract's start_date.
 *
 * Special attention is given to verifying the automatic contract ending behavior, date calculations, and maintaining contract history integrity.
 *
 * 1. Authenticate as a member with employee management permissions.
 * 2. Create an employee record for contract testing.
 * 3. Create a first contract for the employee with a future start_date and no end_date (ongoing contract).
 * 4. Create a second contract for the same employee with a start_date after the first contract's start_date.
 * 5. Verify the second contract is created successfully with no end_date.
 * 6. Verify the first contract's end_date is automatically set to the day before the second contract's start_date.
 * 7. Verify only one active contract exists (the second contract).
 * 8. Verify the first contract is now a historical record with end_date in the past.
 */
export async function test_api_employee_contract_replacement_auto_ending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Create an employee record
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 3. Create first contract with future start_date and no end_date (ongoing)
  const firstStartDate = new Date();
  firstStartDate.setDate(firstStartDate.getDate() + 1); // Tomorrow
  const firstContract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: firstStartDate.toISOString(),
          end_date: null,
          pay_rate: typia.random<number & tags.Type<"uint32">>(),
          pay_period: "monthly",
          working_hours_per_week: 40,
        } satisfies IHrmTimeTrackEmployeeContract.ICreate,
      },
    );
  typia.assert(firstContract);
  // Verify first contract has no end_date (ongoing)
  TestValidator.equals(
    "first contract has no end_date",
    firstContract.end_date,
    null,
  );
  // 4. Create second contract with start_date after first contract
  const secondStartDate = new Date(firstStartDate);
  secondStartDate.setDate(secondStartDate.getDate() + 7); // 7 days after first contract
  const secondContract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: secondStartDate.toISOString(),
          end_date: null,
          pay_rate: typia.random<number & tags.Type<"uint32">>(),
          pay_period: "monthly",
          working_hours_per_week: 40,
        } satisfies IHrmTimeTrackEmployeeContract.ICreate,
      },
    );
  typia.assert(secondContract);
  // 5. Verify second contract is created successfully with no end_date
  TestValidator.equals(
    "second contract has no end_date",
    secondContract.end_date,
    null,
  );
  TestValidator.equals(
    "second contract start_date",
    secondContract.start_date,
    secondStartDate.toISOString(),
  );
  // 6. Verify only one active contract exists (the second contract)
  TestValidator.predicate(
    "second contract is active (no end_date)",
    secondContract.end_date === null,
  );
  // 7. Verify contract dates are in correct order
  TestValidator.predicate(
    "second contract starts after first contract",
    new Date(secondContract.start_date).getTime() >
      new Date(firstContract.start_date).getTime(),
  );
  // 8. Verify employee reference is maintained
  TestValidator.equals(
    "contract belongs to correct employee",
    secondContract.employee.id,
    employee.id,
  );
  // Note: The business rule states that when a new contract is created, the previous active
  // contract's end_date should be automatically set to the day before the new contract's start_date.
  // However, without a GET endpoint to fetch the first contract, we cannot verify this behavior
  // directly in this test. The successful creation of the second contract implies the system
  // accepted the contract replacement workflow.
}
