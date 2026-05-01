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
 * Test that a superseded contract cannot be soft-deleted and is preserved as an
 * immutable historical record.
 *
 * Validates the contract lifecycle where a newer contract supersedes an older
 * one. When a second contract is created for the same employee with a later
 * start date, the system automatically closes the previous active contract by
 * setting its end date to the day before the new contract's start date. The
 * superseded contract becomes an immutable historical record that must not be
 * deleted — any attempt to soft-delete it must be rejected with a 409 Conflict
 * response.
 *
 * 1. A member joins and creates an organization, becoming the Owner.
 * 2. A custom role is created for employee assignment.
 * 3. An employee is created with the custom role and full-time employment type.
 * 4. The first contract is created for the employee with start_date
 *    2026-01-01, hourly pay period, and no end date.
 * 5. A second contract is created with start_date 2026-03-01, which causes the
 *    system to auto-close the first contract by setting its end_date to
 *    2026-02-28, superseding it.
 * 6. Attempting to soft-delete the superseded first contract is rejected with
 *    409 Conflict, confirming superseded contracts are immutable historical
 *    records.
 */
export async function test_api_contract_soft_delete_superseded_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member — creates organization, member becomes Owner
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create custom role for employee assignment
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {});
  typia.assert(role);
  // 3. Create employee with the custom role and full-time employment type
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        erp_hrm_role_id: role.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Create first contract — original active contract, no end date
  const firstContract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: "2026-01-01T00:00:00.000Z",
          pay_period: "hourly",
          pay_rate: 25,
          working_hours_per_week: 40,
          end_date: null,
        },
      },
    );
  typia.assert(firstContract);
  // 5. Create second contract with later start date — auto-closes first
  const secondContract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: "2026-03-01T00:00:00.000Z",
          pay_period: "hourly",
          pay_rate: 30,
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(secondContract);
  // 6. Attempt to soft-delete the superseded first contract — expect 409
  await TestValidator.error(
    "superseded contract cannot be deleted",
    async () => {
      await api.functional.erpHrm.member.contracts.erase(memberConnection, {
        contractId: firstContract.id,
      });
    },
  );
}
