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
 * Test the creation of the first employment contract for a newly invited employee.
 *
 * Validates the complete contract creation workflow for a new hire scenario. The test registers a member, creates a custom role, invites an employee, and then creates the employee's initial employment contract with explicit compensation terms. The contract is verified to have no end_date (ongoing), null deleted_at (active), correct pay_rate/pay_period/working_hours_per_week, and a resolved employee reference.
 *
 * Since this is the employee's first contract, no auto-closure of a previous contract occurs. The test confirms that only one contract exists for the employee with end_date null and deleted_at null, representing an ongoing employment relationship with no predetermined termination date.
 *
 * 1. Register and authenticate a new member via authorize_member_join.
 * 2. Create a custom role with randomized permissions via generate_random_erp_hrm_roles_create.
 * 3. Invite an employee with the created role via generate_random_erp_hrm_member_employees_create.
 * 4. Create the first contract with hourly pay_rate 25.50, 40 working hours per week, a future start_date, and descriptive notes.
 * 5. Validate all contract response fields match the input and verify employee reference resolution.
 */
export async function test_api_contract_creation_first_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a custom role
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {});
  typia.assert(role);
  // 3. Invite employee with the created role
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create first contract with specific compensation terms
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const start_date = futureDate.toISOString();
  const contract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date,
          end_date: null,
          pay_rate: 25.5,
          pay_period: "hourly",
          working_hours_per_week: 40,
          notes: "Initial employment contract with hourly compensation",
        },
      },
    );
  typia.assert(contract);
  // 5. Validate contract response
  TestValidator.equals("pay_rate", contract.pay_rate, 25.5);
  TestValidator.equals("pay_period", contract.pay_period, "hourly");
  TestValidator.equals(
    "working_hours_per_week",
    contract.working_hours_per_week,
    40,
  );
  TestValidator.equals("start_date", contract.start_date, start_date);
  TestValidator.equals(
    "end_date is null (ongoing contract)",
    contract.end_date,
    null,
  );
  TestValidator.equals(
    "notes",
    contract.notes,
    "Initial employment contract with hourly compensation",
  );
  TestValidator.equals("deleted_at is null", contract.deleted_at, null);
  TestValidator.equals("employee reference", contract.employee.id, employee.id);
}
