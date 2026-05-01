import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_member_employees_contracts_create";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test that an employee views their own contract history spanning multiple contracts.
 *
 * Validates the contract listing endpoint for an employee who has two contracts: one past (auto-closed by a newer contract) and one currently active. The test ensures the employee can list their own contracts without the employee:view permission, that contracts are ordered by start_date descending, and that is_active correctly identifies which contract is currently in effect.
 *
 * 1. An employee member joins the platform and authenticates.
 * 2. An admin member joins the platform (organization owner).
 * 3. Admin creates a custom role for employee assignment.
 * 4. Admin creates the employee record linked to the employee member's email.
 * 5. Admin creates the first contract for the employee (current date).
 * 6. Admin creates a second contract with a future start date, which auto-closes the first contract.
 * 7. The employee lists their own contracts and validates:
 *    7.1. Both contracts appear in the response (total records = 2).
 *    7.2. Results are ordered by start_date descending — the newer contract appears first.
 *    7.3. The active contract (newer) has is_active = true and end_date = null.
 *    7.4. The past contract (older) has is_active = false and a non-null end_date.
 *    7.5. Pagination metadata reflects the correct record count and page structure.
 */
export async function test_api_contract_list_own_with_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Employee member joins the platform
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuthorized = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(employeeAuthorized);
  // 2. Admin member joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // 3. Admin creates a custom role
  const role = await generate_random_erp_hrm_roles_create(adminConnection, {});
  typia.assert(role);
  // 4. Admin creates the employee record for the employee member
  const employee = await generate_random_erp_hrm_member_employees_create(
    adminConnection,
    {
      body: {
        email: employeeAuthorized.email,
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employee);
  // 5. Admin creates the first contract for the employee
  const contract1 =
    await generate_random_erp_hrm_member_employees_contracts_create(
      adminConnection,
      {
        params: { employeeId: employee.id },
      },
    );
  typia.assert(contract1);
  // 6. Admin creates a second contract with a later start date,
  //    which auto-closes the first contract
  const contract2 =
    await generate_random_erp_hrm_member_employees_contracts_create(
      adminConnection,
      {
        body: {
          start_date: new Date(Date.now() + 86400000).toISOString(),
        },
        params: { employeeId: employee.id },
      },
    );
  typia.assert(contract2);
  // 7. Employee lists their own contracts
  const page = await api.functional.erpHrm.member.employees.contracts.index(
    employeeConnection,
    {
      employeeId: employee.id,
      body: {},
    },
  );
  typia.assert(page);
  // 7.1. Validate pagination metadata
  TestValidator.equals("total records", page.pagination.records, 2);
  TestValidator.equals("total pages", page.pagination.pages, 1);
  TestValidator.equals("current page", page.pagination.current, 1);
  // 7.2. Validate response data contains both contracts
  TestValidator.equals("contracts count", page.data.length, 2);
  // 7.3. Most recent contract appears first — should be contract2 (active)
  const recentContract = page.data[0]!;
  typia.assertGuard(recentContract);
  TestValidator.equals(
    "most recent contract id",
    recentContract.id,
    contract2.id,
  );
  TestValidator.predicate(
    "most recent contract is active",
    recentContract.is_active === true,
  );
  TestValidator.equals(
    "active contract end_date is null",
    recentContract.end_date,
    null,
  );
  // 7.4. Second entry should be contract1 — the past (auto-closed) contract
  const pastContract = page.data[1]!;
  typia.assertGuard(pastContract);
  TestValidator.equals("past contract id", pastContract.id, contract1.id);
  TestValidator.predicate(
    "past contract is not active",
    pastContract.is_active === false,
  );
  TestValidator.predicate(
    "past contract has non-null end_date",
    pastContract.end_date !== null,
  );
}
