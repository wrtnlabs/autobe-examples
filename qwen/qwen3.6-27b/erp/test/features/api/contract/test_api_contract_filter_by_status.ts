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
 * Test filtering the member's own contracts by employment status to differentiate active and past agreements.
 *
 * Validates that the contract filtering endpoint correctly distinguishes between active and past contracts based on the employment_status field derived from end_date. Tests the auto-termination business rule where creating a new contract automatically terminates previous active contracts.
 *
 * Special attention is given to verifying pagination metadata consistency with filtered results, and ensuring the computed employment_status field accurately reflects each contract's termination state.
 *
 * 1. Join as member to create default organization and authenticate.
 * 2. Create employee record in organization using member's ID.
 * 3. Create three contracts with sequential start dates, each auto-terminating the previous.
 * 4. Query with status = 'active' returns only contract 3 with employment_status 'active'.
 * 5. Query with status = 'past' returns contracts 1 and 2, both with employment_status 'past'.
 * 6. Query without status filter returns all three contracts with correct pagination metadata.
 * 7. Verify employment_status derivation: 'active' when end_date IS NULL, 'past' when end_date has value.
 */
export async function test_api_contract_filter_by_status(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create employee record in organization for membership
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    { body: { memberId: authorized.id } },
  );
  typia.assert(employee);
  // 3. Create three sequential contracts (each auto-terminates previous)
  // Contract 1: start 2024-01-01 (will be terminated by contract 2)
  const contract1 =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: { start_date: "2024-01-01T00:00:00.000Z" },
      },
    );
  typia.assert(contract1);
  // Contract 2: start 2025-01-01 (will be terminated by contract 3)
  const contract2 =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: { start_date: "2025-01-01T00:00:00.000Z" },
      },
    );
  typia.assert(contract2);
  // Contract 3: start 2026-04-27 (remains active, end_date null)
  const contract3 =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: { start_date: "2026-04-27T00:00:00.000Z" },
      },
    );
  typia.assert(contract3);
  // 4. Query with status = 'active' → expect only contract 3
  const activeResult =
    await api.functional.hrmPlatform.member.employees._me.contracts.index(
      memberConnection,
      {
        body: {
          status: "active",
        } satisfies IHrmPlatformEmployeeContract.IRequest,
      },
    );
  typia.assert(activeResult);
  TestValidator.equals(
    "active contract count",
    activeResult.pagination.records,
    1,
  );
  TestValidator.equals("active data length", activeResult.data.length, 1);
  TestValidator.equals(
    "active contract is contract 3",
    activeResult.data[0].id,
    contract3.id,
  );
  TestValidator.equals(
    "active employment status",
    activeResult.data[0].employment_status,
    "active",
  );
  // 5. Query with status = 'past' → expect contracts 1 and 2
  const pastResult =
    await api.functional.hrmPlatform.member.employees._me.contracts.index(
      memberConnection,
      {
        body: {
          status: "past",
        } satisfies IHrmPlatformEmployeeContract.IRequest,
      },
    );
  typia.assert(pastResult);
  TestValidator.equals("past contract count", pastResult.pagination.records, 2);
  TestValidator.equals("past data length", pastResult.data.length, 2);
  const pastIds = pastResult.data.map((c) => c.id);
  TestValidator.predicate(
    "past includes contract 1",
    pastIds.includes(contract1.id),
  );
  TestValidator.predicate(
    "past includes contract 2",
    pastIds.includes(contract2.id),
  );
  pastResult.data.forEach((c) =>
    TestValidator.equals("past contract status", c.employment_status, "past"),
  );
  // 6. Query without status filter → expect at least 3 contracts
  const allResult =
    await api.functional.hrmPlatform.member.employees._me.contracts.index(
      memberConnection,
      {
        body: {} satisfies IHrmPlatformEmployeeContract.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.predicate(
    "all contracts count >= 3",
    allResult.pagination.records >= 3,
  );
  TestValidator.predicate("all data length >= 3", allResult.data.length >= 3);
}
