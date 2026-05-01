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
 * Test contract listing with status filter to verify active/past computation.
 *
 * Validates that the status filter correctly distinguishes between active and past contracts based on dynamic computation at query time. An employee's contract becomes "past" when superseded by a newer contract — the system automatically closes the previous contract by setting its end_date to the day before the new contract's start_date, ensuring only one active contract exists at any time.
 *
 * 1. Admin registers, creating the organization.
 * 2. Admin creates a custom role for the employee.
 * 3. A separate employee member registers with a unique email.
 * 4. Admin creates the employee record, linking the member to the organization.
 * 5. Admin creates the first contract with a start_date 30 days in the past.
 * 6. Admin creates the second contract with today's start_date, auto-closing the first.
 * 7. Query with status='active' — verify exactly one active contract with is_active=true and null end_date.
 * 8. Query with status='past' — verify exactly one past contract with is_active=false and non-null end_date.
 * 9. Verify pagination records count matches the filtered count for each status.
 */
export async function test_api_contract_list_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin/owner registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {});
  // 2. Create a custom role for the employee
  const role = await generate_random_erp_hrm_roles_create(adminConnection, {});
  // 3. Employee member registration (separate person)
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(employeeConnection, {
    body: { email: employeeEmail },
  });
  // 4. Admin creates the employee record in the organization
  const employee = await generate_random_erp_hrm_member_employees_create(
    adminConnection,
    {
      body: {
        email: employeeEmail,
        erp_hrm_role_id: role.id,
        employment_type: "full-time",
      } satisfies DeepPartial<IErpHrmEmployee.ICreate>,
    },
  );
  typia.assert(employee);
  // 5. Create first contract — starts 30 days ago, ongoing (no end_date)
  const pastStartDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const firstContract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      adminConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: pastStartDate,
        } satisfies DeepPartial<IErpHrmContract.ICreate>,
      },
    );
  typia.assert(firstContract);
  // 6. Create second contract — starts today, auto-closes the first
  const activeStartDate = new Date().toISOString();
  const secondContract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      adminConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: activeStartDate,
        } satisfies DeepPartial<IErpHrmContract.ICreate>,
      },
    );
  typia.assert(secondContract);
  // 7. Query with status='active'
  const activeResult =
    await api.functional.erpHrm.member.employees.contracts.index(
      adminConnection,
      {
        employeeId: employee.id,
        body: {
          status: "active",
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(activeResult);
  // 8. Query with status='past'
  const pastResult =
    await api.functional.erpHrm.member.employees.contracts.index(
      adminConnection,
      {
        employeeId: employee.id,
        body: {
          status: "past",
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(pastResult);
  // 9. Validate active contract
  TestValidator.equals("active contracts count", activeResult.data.length, 1);
  TestValidator.equals(
    "active contract pagination records",
    activeResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "active contract id matches second contract",
    activeResult.data[0].id,
    secondContract.id,
  );
  TestValidator.predicate(
    "active contract is_active is true",
    activeResult.data[0].is_active,
  );
  TestValidator.equals(
    "active contract end_date is null",
    activeResult.data[0].end_date,
    null,
  );
  // 10. Validate past contract
  TestValidator.equals("past contracts count", pastResult.data.length, 1);
  TestValidator.equals(
    "past contract pagination records",
    pastResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "past contract id matches first contract",
    pastResult.data[0].id,
    firstContract.id,
  );
  TestValidator.predicate(
    "past contract is_active is false",
    !pastResult.data[0].is_active,
  );
  TestValidator.notEquals(
    "past contract end_date is non-null",
    pastResult.data[0].end_date,
    null,
  );
}
