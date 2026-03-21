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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_contract_employee_view_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  // authorize_member_join creates a member AND organization, making the member the owner
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create an employee record for the authenticated member
  // Using the member's email ensures the employee belongs to this member
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        email: memberAuth.email,
        employmentType: "full_time",
      },
    },
  );
  typia.assert(employee);
  // 3. Create employment contract for the employee
  const contract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      memberConnection,
      {
        params: {
          employeeId: employee.id,
        },
      },
    );
  typia.assert(contract);
  // 4. Retrieve the contract using target endpoint
  // Business rule: Employee can always view their own contracts
  const retrievedContract =
    await api.functional.erpHrm.member.employees.contracts.at(
      memberConnection,
      {
        employeeId: employee.id,
        contractId: contract.id,
      },
    );
  typia.assert(retrievedContract);
  // 5. Validate all contract fields match
  TestValidator.equals("contract id", retrievedContract.id, contract.id);
  TestValidator.equals(
    "start_date",
    retrievedContract.start_date,
    contract.start_date,
  );
  TestValidator.equals(
    "pay_rate",
    retrievedContract.pay_rate,
    contract.pay_rate,
  );
  TestValidator.equals(
    "pay_period",
    retrievedContract.pay_period,
    contract.pay_period,
  );
  TestValidator.equals(
    "working_hours_per_week",
    retrievedContract.working_hours_per_week,
    contract.working_hours_per_week,
  );
  // 6. Validate employee relation is populated with correct member info
  TestValidator.equals(
    "employee id",
    retrievedContract.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "member display_name",
    retrievedContract.employee.member.displayName,
    memberAuth.display_name,
  );
  TestValidator.equals(
    "member email",
    retrievedContract.employee.member.email,
    memberAuth.email,
  );
}
