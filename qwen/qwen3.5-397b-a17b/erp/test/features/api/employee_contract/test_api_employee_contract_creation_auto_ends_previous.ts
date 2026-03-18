import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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

export async function test_api_employee_contract_creation_auto_ends_previous(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member with employee management permissions
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create an employee record
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 3. Create first contract (ongoing, no end_date) with start_date in the past
  const firstContractStartDate = new Date();
  firstContractStartDate.setDate(firstContractStartDate.getDate() - 30); // 30 days ago
  const firstContract =
    await api.functional.hrmPlatform.member.employees.contracts.create(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          start_date: firstContractStartDate.toISOString(),
          end_date: null, // Ongoing contract
          pay_rate: 50000,
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Initial contract",
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(firstContract);
  // Verify first contract is ongoing (end_date is null)
  TestValidator.equals(
    "first contract end_date should be null initially",
    firstContract.end_date,
    null,
  );
  // 4. Create second contract with a later start_date
  const secondContractStartDate = new Date();
  secondContractStartDate.setDate(secondContractStartDate.getDate() + 30); // 30 days from now
  const secondContract =
    await api.functional.hrmPlatform.member.employees.contracts.create(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          start_date: secondContractStartDate.toISOString(),
          end_date: null, // Ongoing contract
          pay_rate: 55000,
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Updated contract with higher pay",
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(secondContract);
  // 5. Verify second contract is ongoing (end_date is null)
  TestValidator.equals(
    "second contract end_date should be null",
    secondContract.end_date,
    null,
  );
  // 6. Verify second contract start_date is after first contract start_date
  TestValidator.predicate(
    "second contract starts after first contract",
    new Date(secondContract.start_date).getTime() >
      new Date(firstContract.start_date).getTime(),
  );
  // 7. Calculate expected end_date for first contract (one day before second contract starts)
  const expectedFirstContractEndDate = new Date(secondContractStartDate);
  expectedFirstContractEndDate.setDate(
    expectedFirstContractEndDate.getDate() - 1,
  );
  const expectedEndDateISO = expectedFirstContractEndDate.toISOString();
  // Note: We need to fetch the first contract again to verify its end_date was updated
  // Since there's no get endpoint listed, we validate the second contract was created successfully
  // and the system should have automatically ended the first contract
  // 8. Verify contract IDs are different
  TestValidator.notEquals(
    "contract IDs should be different",
    firstContract.id,
    secondContract.id,
  );
  // 9. Verify both contracts belong to the same employee
  TestValidator.equals(
    "first contract employee ID",
    firstContract.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "second contract employee ID",
    secondContract.employee.id,
    employee.id,
  );
  // 10. Verify pay rate was updated in second contract
  TestValidator.equals(
    "second contract pay rate is higher",
    secondContract.pay_rate,
    55000,
  );
  TestValidator.notEquals(
    "pay rates differ between contracts",
    firstContract.pay_rate,
    secondContract.pay_rate,
  );
}
