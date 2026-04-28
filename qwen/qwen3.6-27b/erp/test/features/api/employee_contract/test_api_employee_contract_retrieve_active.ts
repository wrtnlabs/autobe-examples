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
 * Test retrieval of an active employment contract with no end date.
 *
 * Validates the complete workflow of creating and retrieving an active employment contract within the organization context. The test ensures that contracts without a specified end_date are correctly treated as ongoing employment relationships with no predefined conclusion.
 *
 * Special attention is given to verifying that end_date is null for ongoing contracts, all required contract fields are present and valid, the employee relation is properly included in the response, and compensation terms (pay_rate and working_hours_per_week) are positive values.
 *
 * 1. Authenticate as a new member, which creates a default organization.
 * 2. Create an employee record in the organization.
 * 3. Create an active contract with start_date, pay_rate, pay_period, and working_hours_per_week (end_date omitted for ongoing).
 * 4. Retrieve the contract by employeeId and contractId.
 * 5. Verify all contract fields match creation input, end_date is null, employee relation exists, and deleted_at is null for active.
 */
export async function test_api_employee_contract_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member - join creates default organization
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Create an employee in the organization
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(employee);
  // 3. Create an active contract (end_date=null omitted, meaning ongoing)
  const createdContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      { params: { employeeId: employee.id } },
    );
  typia.assert(createdContract);
  // 4. Retrieve the contract by employeeId and contractId
  const retrievedContract =
    await api.functional.hrmPlatform.member.employees.contracts.at(
      memberConnection,
      {
        employeeId: employee.id,
        contractId: createdContract.id,
      },
    );
  typia.assert(retrievedContract);
  // 5. Validate - retrieved contract matches created contract
  TestValidator.equals(
    "contract id matches",
    retrievedContract.id,
    createdContract.id,
  );
  TestValidator.equals(
    "start_date matches",
    retrievedContract.start_date,
    createdContract.start_date,
  );
  TestValidator.equals(
    "pay_rate matches",
    retrievedContract.pay_rate,
    createdContract.pay_rate,
  );
  TestValidator.equals(
    "pay_period matches",
    retrievedContract.pay_period,
    createdContract.pay_period,
  );
  TestValidator.equals(
    "working_hours_per_week matches",
    retrievedContract.working_hours_per_week,
    createdContract.working_hours_per_week,
  );
  TestValidator.equals(
    "notes matches",
    retrievedContract.notes,
    createdContract.notes,
  );
  // 6. Validate active contract specific conditions
  // end_date must be null for an active/ongoing contract
  TestValidator.equals(
    "end_date is null for active contract",
    retrievedContract.end_date,
    null,
  );
  // deleted_at must be null for an active contract
  TestValidator.equals(
    "deleted_at is null for active contract",
    retrievedContract.deleted_at,
    null,
  );
  // pay_rate must be a positive number
  TestValidator.predicate(
    "pay_rate is positive",
    retrievedContract.pay_rate > 0,
  );
  // working_hours_per_week must be a positive integer
  TestValidator.predicate(
    "working_hours_per_week is positive",
    retrievedContract.working_hours_per_week > 0,
  );
  // pay_period must be a valid enum value (hourly, daily, weekly, monthly)
  const validPayPeriods = ["hourly", "daily", "weekly", "monthly"] as const;
  TestValidator.predicate(
    "pay_period is valid enum value",
    validPayPeriods.includes(
      retrievedContract.pay_period as (typeof validPayPeriods)[number],
    ),
  );
  // employee relation must be present and have employee id matching the created employee
  TestValidator.equals(
    "employee relation id matches",
    retrievedContract.employee.id,
    employee.id,
  );
}
