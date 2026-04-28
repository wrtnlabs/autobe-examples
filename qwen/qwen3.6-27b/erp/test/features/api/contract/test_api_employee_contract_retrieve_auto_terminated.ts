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
 * Test retrieval of a historical/past employment contract where the system automatically terminated the previous active contract when a new contract was created.
 *
 * Validates the auto-termination business rule: WHEN a new contract is created for an employee who already has an active contract, THE system SHALL automatically end the previous active contract by setting its end_date to the day before the new contract's start_date. Verifies that historical contract data is preserved including pay_rate, pay_period, working_hours_per_week, and notes. Confirms the first contract's end_date equals the day before the second contract's start_date.
 *
 * 1. Authenticate as a member by joining the platform.
 * 2. Create an employee record.
 * 3. Create the first active contract with a start_date in the past.
 * 4. Create a second contract with a later start_date, which should auto-terminate the first contract.
 * 5. Retrieve the first contract using the employee ID and first contract ID.
 * 6. Validate that the first contract's end_date is set to the day before the second contract's start_date.
 * 7. Validate that all original contract fields are preserved.
 * 8. Validate that the contract is historical (has end_date, not active) but not soft-deleted (deleted_at is null).
 */
export async function test_api_employee_contract_retrieve_auto_terminated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create an employee
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 3. Create first contract (active) with start_date in the past
  const firstContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: {
          start_date: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: null,
          pay_rate: 50,
          pay_period: "hourly",
          working_hours_per_week: 40,
          notes: "First contract",
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(firstContract);
  // 4. Create second contract with a later start_date (should auto-terminate the first contract)
  const secondContractStartDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  await generate_random_hrm_platform_member_employees_contracts_create(
    memberConnection,
    {
      params: {
        employeeId: employee.id,
      },
      body: {
        start_date: secondContractStartDate,
        end_date: null,
        pay_rate: 60,
        pay_period: "hourly",
        working_hours_per_week: 35,
        notes: "Second contract",
      } satisfies IHrmPlatformEmployeeContract.ICreate,
    },
  );
  // 5. Retrieve the first contract (now historical) by employeeId and first contractId
  const retrievedContract =
    await api.functional.hrmPlatform.member.employees.contracts.at(
      memberConnection,
      {
        employeeId: employee.id,
        contractId: firstContract.id,
      },
    );
  typia.assert(retrievedContract);
  // 6. Validate that the first contract's end_date is set (not null)
  TestValidator.predicate(
    "first contract has end_date set",
    retrievedContract.end_date !== null,
  );
  // 7. Validate that end_date equals second contract's start_date minus one day
  const expectedEndDate = new Date(
    new Date(secondContractStartDate).getTime() - 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split("T")[0];
  const actualEndDate = new Date(retrievedContract.end_date!)
    .toISOString()
    .split("T")[0];
  TestValidator.equals(
    "end_date equals second contract start_date minus one day",
    actualEndDate,
    expectedEndDate,
  );
  // 8. Validate that original contract fields are preserved
  TestValidator.equals(
    "pay_rate is preserved",
    retrievedContract.pay_rate,
    firstContract.pay_rate,
  );
  TestValidator.equals(
    "pay_period is preserved",
    retrievedContract.pay_period,
    firstContract.pay_period,
  );
  TestValidator.equals(
    "working_hours_per_week is preserved",
    retrievedContract.working_hours_per_week,
    firstContract.working_hours_per_week,
  );
  TestValidator.equals(
    "notes is preserved",
    retrievedContract.notes,
    firstContract.notes,
  );
  // 9. Validate that the employee relation is present
  TestValidator.predicate(
    "employee relation is present",
    retrievedContract.employee.id !== undefined,
  );
  // 10. Validate that deleted_at is null (contract is not soft-deleted, just historical)
  TestValidator.equals(
    "deleted_at is null",
    retrievedContract.deleted_at,
    null,
  );
}
