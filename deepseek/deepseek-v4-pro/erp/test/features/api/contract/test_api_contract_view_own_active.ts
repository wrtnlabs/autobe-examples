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
 * Test that an employee can retrieve details of their own active employment contract.
 *
 * Validates the core business workflow where employees access their own compensation information — the most common contract viewing scenario. An administrator with employee management permission sets up the organization by creating a custom role, then invites a second user as an employee and creates an active contract for them. The employee then authenticates and retrieves their contract by its identifier.
 *
 * The test verifies that all contract fields are correctly returned: id, start_date, end_date (null for ongoing contracts), pay_rate, pay_period, working_hours_per_week, notes, created_at, and updated_at. The resolved employee summary must reference the authenticated user's own employee record, confirming that employees can only view contracts belonging to themselves. The deleted_at field must be null since the contract is active.
 *
 * 1. Administrator joins the platform and becomes the organization owner.
 * 2. Administrator creates a custom role for employee assignment.
 * 3. A second user joins the platform as the prospective employee.
 * 4. Administrator creates an employee record for the second user with the custom role.
 * 5. Administrator creates an active employment contract with no end date for the employee.
 * 6. Employee retrieves the contract by its unique identifier using their own credentials.
 * 7. Validates all contract fields, employee reference, and active status indicators.
 */
export async function test_api_contract_view_own_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the platform and becomes the organization owner
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_member_join(adminConnection, {});
  // 2. Administrator creates a custom role for employee assignment
  const role = await generate_random_erp_hrm_roles_create(adminConnection, {});
  // 3. A second user joins the platform as the prospective employee
  const employeeAuthConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeAuthConnection, {});
  // 4. Administrator creates an employee record for the second user
  const employee = await generate_random_erp_hrm_member_employees_create(
    adminConnection,
    {
      body: {
        email: employeeAuth.email,
        erp_hrm_role_id: role.id,
      },
    },
  );
  // 5. Administrator creates an active employment contract for the employee
  const contract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      adminConnection,
      {
        body: { end_date: null },
        params: { employeeId: employee.id },
      },
    );
  // 6. Employee retrieves their own contract by its unique identifier
  const viewedContract = await api.functional.erpHrm.member.contracts.at(
    employeeAuthConnection,
    { contractId: contract.id },
  );
  typia.assert(viewedContract);
  // 7. Validate all contract fields match the created contract
  TestValidator.equals("contract id", viewedContract.id, contract.id);
  TestValidator.equals(
    "start date",
    viewedContract.start_date,
    contract.start_date,
  );
  TestValidator.equals("end date is null", viewedContract.end_date, null);
  TestValidator.equals("pay rate", viewedContract.pay_rate, contract.pay_rate);
  TestValidator.equals(
    "pay period",
    viewedContract.pay_period,
    contract.pay_period,
  );
  TestValidator.equals(
    "working hours per week",
    viewedContract.working_hours_per_week,
    contract.working_hours_per_week,
  );
  TestValidator.equals("notes", viewedContract.notes, contract.notes);
  TestValidator.equals("deleted_at is null", viewedContract.deleted_at, null);
  // 8. Validate employee reference matches the authenticated user's own employee record
  TestValidator.equals("employee id", viewedContract.employee.id, employee.id);
  TestValidator.equals(
    "employee email",
    viewedContract.employee.member.email,
    employeeAuth.email,
  );
}
