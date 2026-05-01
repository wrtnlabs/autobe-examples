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
 * Test contract lifecycle preservation — superseded contracts remain viewable
 * as immutable historical records for auditing and compliance.
 *
 * Validates that when a new employment contract is created for an employee,
 * the previous active contract is automatically closed by setting its end_date
 * rather than being deleted or modified. The historical contract retains all
 * original compensation terms — pay rate, pay period, working hours per week,
 * and effective start date — while gaining a non-null end_date confirming it
 * was properly superseded.
 *
 * The owning employee retrieves the historical contract and verifies complete
 * preservation of original data. This confirms the contract lifecycle rule:
 * only one contract is active at any given time, but all past contracts are
 * preserved as immutable, auditable records.
 *
 * 1. Administrator (Owner) joins and creates organization.
 * 2. Administrator creates a custom role for the employee.
 * 3. Employee registers a member account with known credentials.
 * 4. Administrator creates an employee record linking the member to the
 *    organization with the assigned role.
 * 5. Administrator creates the first employment contract for the employee.
 * 6. Administrator creates a second contract with a later start date — the
 *    system auto-closes the first contract by setting its end_date.
 * 7. Employee logs in to refresh organization context in session.
 * 8. Employee retrieves the first (now historical) contract.
 * 9. Validates that all original compensation terms are preserved intact
 *    and that end_date was set by the auto-closure mechanism.
 */
export async function test_api_contract_view_historical_superseded(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin (Owner) joins — creates organization with Owner role
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {});
  // 2. Admin creates a custom role for the employee
  const role = await generate_random_erp_hrm_roles_create(adminConnection, {});
  // 3. Employee joins — creates member account with known credentials
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeJoinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(employeeJoinConnection, {
    body: { email: employeeEmail, password: employeePassword },
  });
  // 4. Admin creates employee record — adds member to organization
  const employee = await generate_random_erp_hrm_member_employees_create(
    adminConnection,
    {
      body: {
        email: employeeEmail,
        erp_hrm_role_id: role.id,
      },
    },
  );
  // 5. Admin creates first employment contract for employee
  const contract1 =
    await generate_random_erp_hrm_member_employees_contracts_create(
      adminConnection,
      {
        params: { employeeId: employee.id },
      },
    );
  typia.assert(contract1);
  // 6. Admin creates second contract with later start date —
  //    system auto-closes the first contract
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const contract2 =
    await generate_random_erp_hrm_member_employees_contracts_create(
      adminConnection,
      {
        params: { employeeId: employee.id },
        body: { start_date: futureDate.toISOString() },
      },
    );
  typia.assert(contract2);
  // 7. Employee logs in to obtain organization context in session
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: "",
      referrer: "",
    },
  });
  // 8. Employee retrieves the first (now historical) contract
  const historical = await api.functional.erpHrm.member.contracts.at(
    employeeConnection,
    { contractId: contract1.id },
  );
  typia.assert(historical);
  // 9. Validate the historical contract is preserved as an immutable record
  TestValidator.equals("contract id preserved", historical.id, contract1.id);
  TestValidator.equals(
    "original start_date preserved",
    historical.start_date,
    contract1.start_date,
  );
  TestValidator.predicate(
    "end_date was set by auto-closure",
    historical.end_date !== null,
  );
  TestValidator.equals(
    "original pay_rate preserved",
    historical.pay_rate,
    contract1.pay_rate,
  );
  TestValidator.equals(
    "original pay_period preserved",
    historical.pay_period,
    contract1.pay_period,
  );
  TestValidator.equals(
    "original working_hours_per_week preserved",
    historical.working_hours_per_week,
    contract1.working_hours_per_week,
  );
}
