import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
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
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_employee_contract } from "../../../prepare/prepare_random_hrm_platform_employee_contract";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test listing employee contracts with self-access and default sort order.
 *
 * Validates that an authenticated member can list their own employee contracts and that the results are correctly sorted by start_date in descending order (most recent first) by default. Verifies that pagination metadata is accurate and that the employment_status field is correctly derived from the presence or absence of an end_date.
 *
 * 1. Authenticate as a new member via member join.
 * 2. Create a custom role for employee assignment.
 * 3. Create an employee record for the authenticated member.
 * 4. Create two contracts with different start dates:
 *    4.1. An older past contract with an end_date (employment_status should be 'past').
 *    4.2. A newer active contract without an end_date (employment_status should be 'active').
 * 5. List contracts using the index endpoint with default parameters.
 * 6. Verify contracts are sorted by start_date descending (newest first).
 * 7. Verify pagination metadata (current=1, limit=100, records=2, pages=1).
 * 8. Verify employment_status values ('active' for no end_date, 'past' for end_date set).
 */
export async function test_api_contracts_list_self_access_default_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create a role
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(role);
  // 3. Create employee for this member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        memberId: member.id,
        roleId: role.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Create two contracts with different start dates
  // 4.1. Older contract (past) - started 60 days ago, ended 30 days ago
  const olderStartDate = new Date();
  olderStartDate.setDate(olderStartDate.getDate() - 60);
  const olderEndDate = new Date();
  olderEndDate.setDate(olderEndDate.getDate() - 30);
  await generate_random_hrm_platform_member_employees_contracts_create(
    memberConnection,
    {
      params: { employeeId: employee.id },
      body: {
        start_date: olderStartDate.toISOString(),
        end_date: olderEndDate.toISOString(),
        pay_rate: 50000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      },
    },
  );
  // 4.2. Newer contract (active) - started 30 days ago, no end date
  const newerStartDate = new Date();
  newerStartDate.setDate(newerStartDate.getDate() - 30);
  await generate_random_hrm_platform_member_employees_contracts_create(
    memberConnection,
    {
      params: { employeeId: employee.id },
      body: {
        start_date: newerStartDate.toISOString(),
        end_date: null,
        pay_rate: 60000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      },
    },
  );
  // 5. List contracts with default parameters (no explicit sort)
  const reqBody = {} satisfies IHrmPlatformEmployeeContract.IRequest;
  const result =
    await api.functional.hrmPlatform.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: reqBody,
      },
    );
  typia.assert(result);
  // 6. Validate contracts are sorted by start_date descending
  TestValidator.equals("contract count", result.data.length, 2);
  // Newest contract should be first (index 0)
  const firstContract = result.data[0];
  const secondContract = result.data[1];
  TestValidator.predicate(
    "first contract is newer than second",
    new Date(firstContract.start_date).getTime() >
      new Date(secondContract.start_date).getTime(),
  );
  // 7. Verify pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("page limit", result.pagination.limit, 100);
  TestValidator.equals("total records", result.pagination.records, 2);
  TestValidator.equals("total pages", result.pagination.pages, 1);
  // 8. Verify employment_status values
  // First contract (newer, active) should have employment_status 'active'
  TestValidator.equals(
    "newer contract has active status",
    firstContract.employment_status,
    "active",
  );
  // Second contract (older, past) should have employment_status 'past'
  TestValidator.equals(
    "older contract has past status",
    secondContract.employment_status,
    "past",
  );
  // Verify active contract has no end_date
  TestValidator.equals(
    "active contract end_date is null",
    firstContract.end_date,
    null,
  );
  // Verify past contract has an end_date set
  TestValidator.predicate(
    "past contract has end_date set",
    secondContract.end_date !== null,
  );
}
