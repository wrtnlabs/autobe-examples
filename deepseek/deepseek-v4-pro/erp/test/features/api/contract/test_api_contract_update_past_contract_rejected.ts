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
 * Verify that attempting to update a past (superseded) contract is rejected with
 * 422 as an immutable historical record.
 *
 * Past contracts that have been superseded by newer agreements are preserved as
 * immutable records for audit and compliance. The system must reject any attempt
 * to modify these records. The test validates both the rejection of past contract
 * updates and that the active contract remains editable.
 *
 * 1. Organization owner authenticates via member join and receives JWT tokens.
 * 2. A second member joins — their email is used to create an active employee
 *    record in the owner's organization (existing member triggers immediate
 *    activation rather than a pending invitation).
 * 3. A custom role with employee:manage permission is created.
 * 4. The second member is added as an employee with the custom role.
 * 5. Contract A is created with start_date 30 days ago as the initial contract.
 * 6. Contract B is created with start_date set to now, which auto-closes
 *    Contract A by setting its end_date to the day before Contract B's start_date.
 * 7. Attempting to update Contract A is validated to throw a 422 error, confirming
 *    past contracts are immutable historical records.
 * 8. Contract B is updated successfully, confirming only past contracts are
 *    protected and active contracts remain editable.
 */
export async function test_api_contract_update_past_contract_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner authenticates and creates organization
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a second member (will become the employee)
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(
    employeeMemberConnection,
    {},
  );
  typia.assert(employeeMember);
  // 3. Create role with employee:manage permission
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {
    body: {
      permissions: ["employee:manage"],
    },
  });
  typia.assert(role);
  // 4. Create employee using the second member's email
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: employeeMember.email,
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employee);
  // 5. Create Contract A — initial contract with start_date 30 days ago
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const contractA =
    await generate_random_erp_hrm_member_employees_contracts_create(
      ownerConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: thirtyDaysAgo.toISOString(),
        },
      },
    );
  typia.assert(contractA);
  // 6. Create Contract B with later start_date — auto-closes Contract A
  const contractB =
    await generate_random_erp_hrm_member_employees_contracts_create(
      ownerConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: now.toISOString(),
        },
      },
    );
  typia.assert(contractB);
  // 7. Attempt to update past Contract A — must be rejected with 422
  await TestValidator.httpError(
    "past contract update rejected with 422",
    422,
    async () =>
      await api.functional.erpHrm.member.contracts.update(ownerConnection, {
        contractId: contractA.id,
        body: {
          pay_rate: 999,
        } satisfies IErpHrmContract.IUpdate,
      }),
  );
  // 8. Verify Contract B (active) is still editable
  const updatedContractB = await api.functional.erpHrm.member.contracts.update(
    ownerConnection,
    {
      contractId: contractB.id,
      body: {
        pay_rate: 888,
      } satisfies IErpHrmContract.IUpdate,
    },
  );
  typia.assert(updatedContractB);
  TestValidator.equals(
    "active contract B pay_rate updated",
    updatedContractB.pay_rate,
    888,
  );
}
