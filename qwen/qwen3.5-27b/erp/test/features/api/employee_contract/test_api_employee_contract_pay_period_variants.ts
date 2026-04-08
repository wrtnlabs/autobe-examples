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
 * Test contract creation with different pay period classifications to validate all allowed values work correctly.
 *
 * Validates that employee contracts can be created with all four supported pay period types (hourly, daily, weekly, monthly) and that each pay period value is correctly stored and returned in the API response.
 *
 * Special attention is given to verifying that the pay_period field accepts all enum values, that pay_rate is correctly stored regardless of pay period type, and that all other contract fields are properly maintained across different pay period classifications.
 *
 * 1. Authenticate as a member with employee management permissions.
 * 2. Create four separate employee records for testing different pay period types.
 * 3. Create a contract with pay_period='hourly' for the first employee.
 * 4. Create a contract with pay_period='daily' for the second employee.
 * 5. Create a contract with pay_period='weekly' for the third employee.
 * 6. Create a contract with pay_period='monthly' for the fourth employee.
 * 7. Validate that each contract's pay_period matches the input value.
 * 8. Verify that pay_rate and working_hours_per_week are correctly stored for all contracts.
 */
export async function test_api_employee_contract_pay_period_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create four employees for testing different pay period types
  const hourlyEmployee =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {},
    );
  typia.assert(hourlyEmployee);
  const dailyEmployee =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {},
    );
  typia.assert(dailyEmployee);
  const weeklyEmployee =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {},
    );
  typia.assert(weeklyEmployee);
  const monthlyEmployee =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {},
    );
  typia.assert(monthlyEmployee);
  // 3. Create contract with pay_period='hourly'
  const hourlyContract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: hourlyEmployee.id },
        body: {
          pay_period: "hourly",
          start_date: new Date().toISOString(),
          pay_rate: 25.5,
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(hourlyContract);
  // 4. Create contract with pay_period='daily'
  const dailyContract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: dailyEmployee.id },
        body: {
          pay_period: "daily",
          start_date: new Date().toISOString(),
          pay_rate: 200,
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(dailyContract);
  // 5. Create contract with pay_period='weekly'
  const weeklyContract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: weeklyEmployee.id },
        body: {
          pay_period: "weekly",
          start_date: new Date().toISOString(),
          pay_rate: 800,
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(weeklyContract);
  // 6. Create contract with pay_period='monthly'
  const monthlyContract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: monthlyEmployee.id },
        body: {
          pay_period: "monthly",
          start_date: new Date().toISOString(),
          pay_rate: 3500,
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(monthlyContract);
  // 7. Validate pay_period values match input
  TestValidator.equals(
    "hourly contract pay_period",
    hourlyContract.pay_period,
    "hourly",
  );
  TestValidator.equals(
    "daily contract pay_period",
    dailyContract.pay_period,
    "daily",
  );
  TestValidator.equals(
    "weekly contract pay_period",
    weeklyContract.pay_period,
    "weekly",
  );
  TestValidator.equals(
    "monthly contract pay_period",
    monthlyContract.pay_period,
    "monthly",
  );
  // 8. Validate pay_rate values are correctly stored
  TestValidator.equals(
    "hourly contract pay_rate",
    hourlyContract.pay_rate,
    25.5,
  );
  TestValidator.equals("daily contract pay_rate", dailyContract.pay_rate, 200);
  TestValidator.equals(
    "weekly contract pay_rate",
    weeklyContract.pay_rate,
    800,
  );
  TestValidator.equals(
    "monthly contract pay_rate",
    monthlyContract.pay_rate,
    3500,
  );
  // 9. Validate working_hours_per_week for all contracts
  TestValidator.equals(
    "hourly contract working hours",
    hourlyContract.working_hours_per_week,
    40,
  );
  TestValidator.equals(
    "daily contract working hours",
    dailyContract.working_hours_per_week,
    40,
  );
  TestValidator.equals(
    "weekly contract working hours",
    weeklyContract.working_hours_per_week,
    40,
  );
  TestValidator.equals(
    "monthly contract working hours",
    monthlyContract.working_hours_per_week,
    40,
  );
  // 10. Validate all contracts are active (no end_date or future end_date)
  TestValidator.predicate(
    "hourly contract is active",
    hourlyContract.end_date === null ||
      new Date(hourlyContract.end_date) > new Date(),
  );
  TestValidator.predicate(
    "daily contract is active",
    dailyContract.end_date === null ||
      new Date(dailyContract.end_date) > new Date(),
  );
  TestValidator.predicate(
    "weekly contract is active",
    weeklyContract.end_date === null ||
      new Date(weeklyContract.end_date) > new Date(),
  );
  TestValidator.predicate(
    "monthly contract is active",
    monthlyContract.end_date === null ||
      new Date(monthlyContract.end_date) > new Date(),
  );
}
