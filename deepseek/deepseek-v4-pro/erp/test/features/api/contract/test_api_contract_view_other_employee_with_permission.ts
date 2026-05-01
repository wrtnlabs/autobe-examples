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

export async function test_api_contract_view_other_employee_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager joins (Owner with all permissions including employee:view and employee:manage)
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {});
  typia.assert(managerAuth);
  // 2. Create a role for the employee
  const role = await generate_random_erp_hrm_roles_create(
    managerConnection,
    {},
  );
  typia.assert(role);
  // 3. Second user (employee) joins
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  typia.assert(employeeAuth);
  // 4. Manager creates employee record using the employee's email and the created role
  const employee = await generate_random_erp_hrm_member_employees_create(
    managerConnection,
    {
      body: {
        email: employeeAuth.email,
        erp_hrm_role_id: role.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 5. Manager creates a contract for the employee
  const contract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      managerConnection,
      {
        params: { employeeId: employee.id },
      },
    );
  typia.assert(contract);
  // 6. Manager with employee:view permission retrieves the contract
  const retrievedContract = await api.functional.erpHrm.member.contracts.at(
    managerConnection,
    {
      contractId: contract.id,
    },
  );
  typia.assert(retrievedContract);
  // 7. Validate contract details
  TestValidator.equals(
    "contract id matches",
    retrievedContract.id,
    contract.id,
  );
  TestValidator.equals(
    "employee id matches",
    retrievedContract.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "employee email matches",
    retrievedContract.employee.member.email,
    employeeAuth.email,
  );
  TestValidator.equals(
    "pay rate matches",
    retrievedContract.pay_rate,
    contract.pay_rate,
  );
  TestValidator.equals(
    "pay period matches",
    retrievedContract.pay_period,
    contract.pay_period,
  );
}
