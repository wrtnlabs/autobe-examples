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

/**
 * Test that a user with 'employee:view' permission can retrieve another
 * employee's contract details within the same organization.
 *
 * Flow:
 * 1. Create first member (becomes organization owner)
 * 2. Create organization
 * 3. Create second member account
 * 4. Add second member as employee to first member's organization
 * 5. Create contract for second employee
 * 6. First member retrieves second employee's contract
 */
export async function test_api_contract_manager_view_employee(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member account (will be organization owner/manager)
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(firstMember);
  // Step 2: Create organization owned by first member
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      firstMemberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create second member account (will be the employee whose contract is viewed)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(secondMember);
  // Step 4: Create employee record for second member within first member's organization
  // First member (owner) adds second member as employee
  const secondEmployee = await generate_random_erp_hrm_member_employees_create(
    firstMemberConnection,
    {
      body: {
        email: secondMember.email,
        employmentType: "full_time",
      },
    },
  );
  typia.assert(secondEmployee);
  // Step 5: Create employment contract for the second employee
  const contract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      firstMemberConnection,
      {
        params: {
          employeeId: secondEmployee.id,
        },
      },
    );
  typia.assert(contract);
  // Step 6: As first member (with employee:view permission), retrieve second member's contract
  const retrievedContract =
    await api.functional.erpHrm.member.employees.contracts.at(
      firstMemberConnection,
      {
        employeeId: secondEmployee.id,
        contractId: contract.id,
      },
    );
  typia.assert(retrievedContract);
  // Validations
  TestValidator.equals(
    "contract ID matches",
    retrievedContract.id,
    contract.id,
  );
  TestValidator.equals(
    "employee ID matches",
    retrievedContract.employee.id,
    secondEmployee.id,
  );
  TestValidator.equals(
    "employee belongs to second member",
    retrievedContract.employee.member.email,
    secondMember.email,
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
  TestValidator.equals(
    "working hours match",
    retrievedContract.working_hours_per_week,
    contract.working_hours_per_week,
  );
}
