import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

/**
 * Test successful update of an active employment contract by a manager.
 *
 * Scenario:
 * 1. Create an authenticated member with owner role (has employee:manage permission)
 * 2. Create an employee record within the organization
 * 3. Create an active contract for the employee (start_date in past, end_date null)
 * 4. Update the contract's pay_rate, pay_period, working_hours_per_week, and notes
 * 5. Verify all modifications are persisted correctly
 */
export async function test_api_contract_update_active_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated member with owner role using authorize_member_join
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: undefined,
  });
  typia.assert(managerAuth);
  // Step 2: Create an employee within the organization
  const employee = await generate_random_erp_hrm_member_employees_create(
    managerConnection,
    {
      body: undefined,
    },
  );
  typia.assert(employee);
  // Step 3: Create an active contract for the employee
  // start_date in the past, end_date null for ongoing contract
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const contractCreateBody: IErpHrmContract.ICreate = {
    start_date: startDate.toISOString(),
    end_date: null,
    pay_rate: 50000,
    pay_period: "monthly",
    working_hours_per_week: 40,
    notes: "Initial contract terms",
  } satisfies IErpHrmContract.ICreate;
  const contract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      managerConnection,
      {
        params: { employeeId: employee.id },
        body: contractCreateBody,
      },
    );
  typia.assert(contract);
  // Store original values for comparison
  const originalStartDate = contract.start_date;
  const originalCreatedAt = contract.created_at;
  // Step 4: Update the contract with new values
  const updateBody: IErpHrmContract.IUpdate = {
    pay_rate: 55000,
    pay_period: "monthly",
    working_hours_per_week: 45,
    notes: "Updated contract terms after salary review",
  } satisfies IErpHrmContract.IUpdate;
  const updatedContract =
    await api.functional.erpHrm.member.employees.contracts.update(
      managerConnection,
      {
        employeeId: employee.id,
        contractId: contract.id,
        body: updateBody,
      },
    );
  typia.assert(updatedContract);
  // Step 5: Validate the updated contract
  // Verify contract ID remains the same
  TestValidator.equals(
    "contract id unchanged",
    updatedContract.id,
    contract.id,
  );
  // Verify start_date remains unchanged (immutable field)
  TestValidator.equals(
    "start_date is immutable",
    updatedContract.start_date,
    originalStartDate,
  );
  // Verify pay_rate was updated
  TestValidator.equals("pay_rate updated", updatedContract.pay_rate, 55000);
  // Verify pay_period was updated
  TestValidator.equals(
    "pay_period updated",
    updatedContract.pay_period,
    "monthly",
  );
  // Verify working_hours_per_week was updated
  TestValidator.equals(
    "working_hours_per_week updated",
    updatedContract.working_hours_per_week,
    45,
  );
  // Verify notes was updated
  TestValidator.equals(
    "notes updated",
    updatedContract.notes,
    "Updated contract terms after salary review",
  );
  // Verify end_date remains null (ongoing contract)
  TestValidator.predicate(
    "end_date remains null",
    updatedContract.end_date === null,
  );
  // Verify updated_at timestamp has changed (reflects modification)
  TestValidator.notEquals(
    "updated_at reflects modification",
    updatedContract.updated_at,
    originalCreatedAt,
  );
  // Verify employee relation is properly loaded
  TestValidator.predicate(
    "employee relation loaded",
    updatedContract.employee !== null,
  );
  TestValidator.equals(
    "employee id matches",
    updatedContract.employee.id,
    employee.id,
  );
  TestValidator.predicate(
    "employee has member info",
    updatedContract.employee.member !== null,
  );
}
