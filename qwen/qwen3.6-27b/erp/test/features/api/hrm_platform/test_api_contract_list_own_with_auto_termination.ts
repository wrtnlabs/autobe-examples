import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeContract";
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
 * Test that an authenticated member can list their own employment contracts, verifying the auto-termination behavior when multiple contracts exist.
 *
 * Validates the complete contract lifecycle flow including member authentication, employee record creation, and dual contract creation with auto-termination of the previous active contract. Ensures that when a new contract is created with a start date after an existing active contract, the system automatically terminates the previous contract by setting its end_date to the day before the new contract's start_date.
 *
 * Special attention is given to verifying that the listing endpoint returns paginated results with correct sorting (start_date descending) and that contract employment_status values correctly reflect active versus past employment periods.
 *
 * 1. Member joins the platform and authenticates.
 * 2. Employee record is created for the authenticated member within their organization.
 * 3. First contract is created with a past start_date (2025-01-01) with hourly pay_period.
 * 4. Second contract is created with a later start_date (2026-01-01), triggering auto-termination of the first contract.
 * 5. Contract listing is retrieved and validated for correct pagination, sorting, and employment_status values.
 * 6. First contract has employment_status = 'past' with end_date = 2025-12-31.
 * 7. Second contract has employment_status = 'active' with end_date = null.
 */
export async function test_api_contract_list_own_with_auto_termination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member join and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create employee record for the authenticated member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        memberId: authorized.id,
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType:
          "full-time" satisfies IHrmPlatformEmployee.ICreate["employmentType"],
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 3. Create first contract with past start_date
  const firstContractStart = "2025-01-01T00:00:00.000Z";
  const firstContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        body: {
          start_date: firstContractStart,
          pay_period:
            "hourly" satisfies IHrmPlatformEmployeeContract.ICreate["pay_period"],
          pay_rate: typia.random<number>(),
          working_hours_per_week: typia.random<number & tags.Type<"int32">>(),
        } satisfies IHrmPlatformEmployeeContract.ICreate,
        params: {
          employeeId: employee.id,
        },
      },
    );
  typia.assert(firstContract);
  // 4. Create second contract with later start_date (auto-terminates first contract)
  const secondContractStart = "2026-01-01T00:00:00.000Z";
  const secondContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        body: {
          start_date: secondContractStart,
          pay_period:
            "hourly" satisfies IHrmPlatformEmployeeContract.ICreate["pay_period"],
          pay_rate: typia.random<number>(),
          working_hours_per_week: typia.random<number & tags.Type<"int32">>(),
        } satisfies IHrmPlatformEmployeeContract.ICreate,
        params: {
          employeeId: employee.id,
        },
      },
    );
  typia.assert(secondContract);
  // 5. List contracts via the me endpoint with includeInactive to get both contracts
  const contractsList =
    await api.functional.hrmPlatform.member.employees._me.contracts.index(
      memberConnection,
      {
        body: {
          includeInactive: true,
        } satisfies IHrmPlatformEmployeeContract.IRequest,
      },
    );
  typia.assert(contractsList);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination has records",
    contractsList.pagination.records >= 2,
  );
  TestValidator.equals(
    "pagination current page",
    contractsList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has pages",
    contractsList.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    contractsList.pagination.limit > 0,
  );
  // 7. Validate that both contracts are returned
  TestValidator.equals("contract count", contractsList.data.length, 2);
  // 8. Validate sorting - most recent first (start_date descending by default)
  TestValidator.equals(
    "most recent contract is second",
    contractsList.data[0].id,
    secondContract.id,
  );
  TestValidator.equals(
    "older contract is first",
    contractsList.data[1].id,
    firstContract.id,
  );
  // 9. Find and validate first contract (past status)
  const pastContractIndex = contractsList.data.findIndex(
    (contract) => contract.id === firstContract.id,
  );
  TestValidator.predicate(
    "past contract exists in list",
    pastContractIndex > -1,
  );
  const pastContract = contractsList.data[pastContractIndex];
  typia.assertGuard(pastContract!);
  TestValidator.equals(
    "first contract employment_status",
    pastContract.employment_status,
    "past",
  );
  TestValidator.predicate(
    "first contract end_date is set",
    pastContract.end_date !== null,
  );
  // 10. Find and validate second contract (active status)
  const activeContractIndex = contractsList.data.findIndex(
    (contract) => contract.id === secondContract.id,
  );
  TestValidator.predicate(
    "active contract exists in list",
    activeContractIndex > -1,
  );
  const activeContract = contractsList.data[activeContractIndex];
  typia.assertGuard(activeContract!);
  TestValidator.equals(
    "second contract employment_status",
    activeContract.employment_status,
    "active",
  );
  TestValidator.equals(
    "second contract end_date is null",
    activeContract.end_date,
    null,
  );
  // 11. Verify auto-termination date is the day before new contract start_date
  const firstEndDate = pastContract.end_date!;
  TestValidator.equals(
    "auto-termination date is 2025-12-31",
    firstEndDate.split("T")[0],
    "2025-12-31",
  );
}
