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
 * Test that a member can retrieve another employee's historical (ended) contract.
 *
 * Validates the complete workflow of creating employee contracts, ending a contract by creating a new one, and retrieving the historical contract record. Ensures that ended contracts are properly marked with an end_date in the past and contain complete contract details including compensation terms and employee information.
 *
 * Special attention is given to verifying that the contract lifecycle works correctly: when a new contract is created, the previous active contract is automatically ended. The historical contract should be retrievable and immutable.
 *
 * 1. Member registers and authenticates to the system.
 * 2. Employee record is created for the target employee.
 * 3. First contract is created with a past start_date and end_date to simulate a historical contract.
 * 4. Second contract is created, which automatically ends the first contract.
 * 5. Historical contract is retrieved using employeeId and contractId.
 * 6. Validates that the contract has an end_date in the past and is marked as ended.
 * 7. Validates that the contract contains complete compensation terms (pay_rate, pay_period, working_hours_per_week).
 * 8. Validates that the contract includes associated employee information.
 */
export async function test_api_employee_contract_view_historical_with_permission(
  connection: api.IConnection,
) {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Create employee record
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 3. Create first contract with past dates to make it historical
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const firstContract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: {
          start_date: oneYearAgo.toISOString(),
          end_date: sixMonthsAgo.toISOString(),
          pay_rate: 50000,
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Historical contract for testing",
        } satisfies IHrmTimeTrackEmployeeContract.ICreate,
      },
    );
  typia.assert(firstContract);
  // 4. Create second contract (this should automatically end the first contract)
  const today = new Date();
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const secondContract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: {
          start_date: today.toISOString(),
          end_date: futureDate.toISOString(),
          pay_rate: 60000,
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Current active contract",
        } satisfies IHrmTimeTrackEmployeeContract.ICreate,
      },
    );
  typia.assert(secondContract);
  // 5. Retrieve the historical contract
  const retrievedContract =
    await api.functional.hrmTimeTrack.member.employees.contracts.at(
      memberConnection,
      {
        employeeId: employee.id,
        contractId: firstContract.id,
      },
    );
  typia.assert(retrievedContract);
  // 6. Validate that the contract is marked as ended (end_date in the past)
  TestValidator.predicate(
    "historical contract has end_date",
    retrievedContract.end_date !== null,
  );
  const endDate = new Date(retrievedContract.end_date!);
  const now = new Date();
  TestValidator.predicate("end_date is in the past", endDate < now);
  // 7. Validate complete compensation terms
  TestValidator.equals(
    "pay_rate matches original",
    retrievedContract.pay_rate,
    50000,
  );
  TestValidator.equals(
    "pay_period is monthly",
    retrievedContract.pay_period,
    "monthly",
  );
  TestValidator.equals(
    "working_hours_per_week is 40",
    retrievedContract.working_hours_per_week,
    40,
  );
  // 8. Validate employee information is included
  TestValidator.equals(
    "employee id matches",
    retrievedContract.employee.id,
    employee.id,
  );
  TestValidator.predicate(
    "employee has position",
    retrievedContract.employee.position !== undefined,
  );
  TestValidator.predicate(
    "employee has employment_type",
    retrievedContract.employee.employment_type !== undefined,
  );
  TestValidator.predicate(
    "employee has status",
    retrievedContract.employee.status !== undefined,
  );
  // 9. Validate contract timestamps
  TestValidator.predicate(
    "contract has created_at",
    retrievedContract.created_at !== undefined,
  );
  TestValidator.predicate(
    "contract has updated_at",
    retrievedContract.updated_at !== undefined,
  );
  // 10. Verify the retrieved contract id matches the original
  TestValidator.equals(
    "contract id matches original",
    retrievedContract.id,
    firstContract.id,
  );
}
