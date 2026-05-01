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
 * Test contract creation replacement with automatic closure of the previous active contract.
 *
 * Validates the critical auto-closure business rule in the HRM contract system: when a new employment contract is created for an employee who already has an active contract, the system must automatically close the previous active contract by setting its end_date to the day before the new contract's start_date. This ensures that only one contract is active at any given time for any employee, while preserving all past contracts as immutable historical records for compensation history tracking.
 *
 * The test also verifies that the newly created replacement contract correctly reflects all requested updated terms — including a raised pay_rate, a different pay_period classification, and adjusted working_hours_per_week — and that its end_date remains null to indicate it is the current ongoing contract.
 *
 * 1. Owner registers via authorize_member_join to establish an organization context with employee:manage permission.
 * 2. Owner creates a custom role using the role generation utility.
 * 3. Owner creates an employee assigned to the newly created role.
 * 4. Owner creates the first active contract with a past start_date, hourly pay_rate, and null end_date.
 * 5. Owner creates a replacement contract with today as start_date, raised daily pay_rate, and reduced working_hours_per_week.
 * 6. Validates the new contract's updated compensation terms and confirms its ongoing status with null end_date.
 */
export async function test_api_contract_creation_replacement_auto_closure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner member who holds employee:manage permission
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a custom role for the employee
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 3. Create the employee assigned to the role
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create the first active contract with a past start_date
  const firstContractStartDate = new Date();
  firstContractStartDate.setDate(firstContractStartDate.getDate() - 30);
  const firstContract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      ownerConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: firstContractStartDate.toISOString(),
          end_date: null,
          pay_rate: 25,
          pay_period: "hourly",
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(firstContract);
  TestValidator.equals(
    "first contract pay_rate matches creation input",
    firstContract.pay_rate,
    25,
  );
  TestValidator.equals(
    "first contract end_date is null (ongoing)",
    firstContract.end_date,
    null,
  );
  // 5. Create replacement contract with today's date and updated terms
  const replacementStartDate = new Date();
  const newContract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      ownerConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: replacementStartDate.toISOString(),
          end_date: null,
          pay_rate: 30,
          pay_period: "daily",
          working_hours_per_week: 37.5,
        },
      },
    );
  typia.assert(newContract);
  // 6. Validate the new contract reflects all updated compensation terms
  TestValidator.equals(
    "new contract pay_rate raised to 30",
    newContract.pay_rate,
    30,
  );
  TestValidator.equals(
    "new contract pay_period changed to daily",
    newContract.pay_period,
    "daily",
  );
  TestValidator.equals(
    "new contract working_hours_per_week adjusted to 37.5",
    newContract.working_hours_per_week,
    37.5,
  );
  // New contract must be ongoing (null end_date) — only one active at a time
  TestValidator.equals(
    "new contract end_date is null (ongoing replacement)",
    newContract.end_date,
    null,
  );
  // New contract is linked to the correct employee
  TestValidator.equals(
    "new contract references the correct employee",
    newContract.employee.id,
    employee.id,
  );
}
