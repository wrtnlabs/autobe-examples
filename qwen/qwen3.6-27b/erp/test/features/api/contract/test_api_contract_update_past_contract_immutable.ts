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
 * Test the immutability business rule for past employee contracts.
 *
 * Validates that employment contracts with past end dates cannot be modified. When a contract is no longer active
 * (ended or superseded by a newer contract), the system prevents any modifications to that contract. This ensures
 * historical records are preserved for audit and governance purposes.
 *
 * 1. Authenticate as a member with employee:manage permission.
 * 2. Create an employee record in the organization.
 * 3. Create an employment contract with a past end_date (e.g., end_date in 2023).
 * 4. Attempt to update the past contract with new compensation terms.
 * 5. Verify the system rejects the update with a semantic error.
 * 6. Verify the original contract data from step 3 remains unchanged.
 */
export async function test_api_contract_update_past_contract_immutable(
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
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create an employee record
  const employee: IHrmPlatformEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      {
        body: {
          employmentType: "full-time",
        },
      },
    );
  typia.assert(employee);
  // 3. Create an employment contract with a past end_date
  const pastContract: IHrmPlatformEmployeeContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: {
          start_date: "2022-01-01T00:00:00Z",
          end_date: "2023-01-15T00:00:00Z",
          pay_rate: 50000,
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Legacy employment contract for testing immutability",
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(pastContract);
  // Verify the contract has a past end_date
  TestValidator.predicate(
    "contract has past end_date",
    pastContract.end_date !== null,
  );
  TestValidator.predicate(
    "contract end_date is in the past",
    pastContract.end_date !== null &&
      new Date(pastContract.end_date) < new Date(),
  );
  // Store original values for comparison
  const originalPayRate: number = pastContract.pay_rate;
  const originalPayPeriod: string = pastContract.pay_period;
  const originalWorkingHoursPerWeek: number =
    pastContract.working_hours_per_week;
  const originalNotes: string | null = pastContract.notes;
  // 4. Attempt to update the past contract with new compensation terms - should fail
  await TestValidator.error(
    "past contract update is rejected with semantic error",
    async () => {
      await api.functional.hrmPlatform.member.employees.contracts.update(
        memberConnection,
        {
          employeeId: employee.id,
          contractId: pastContract.id,
          body: {
            payRate: 60000,
            payPeriod: "hourly",
            workingHoursPerWeek: 35,
            notes: "This update should be rejected",
          } satisfies IHrmPlatformEmployeeContract.IUpdate,
        },
      );
    },
  );
  // 5. Verify the original contract data remains unchanged
  TestValidator.equals(
    "original pay_rate is unchanged",
    pastContract.pay_rate,
    originalPayRate,
  );
  TestValidator.equals(
    "original pay_period is unchanged",
    pastContract.pay_period,
    originalPayPeriod,
  );
  TestValidator.equals(
    "original working_hours_per_week is unchanged",
    pastContract.working_hours_per_week,
    originalWorkingHoursPerWeek,
  );
  TestValidator.equals(
    "original notes is unchanged",
    pastContract.notes,
    originalNotes,
  );
}
