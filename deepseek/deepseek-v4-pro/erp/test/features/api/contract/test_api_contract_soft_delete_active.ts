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
 * Verify that an active, non-superseded, non-expired contract can be successfully soft-deleted.
 *
 * Validates the contract soft-deletion workflow for a contract that was created in error. The test creates an active, ongoing contract with a future start date and no end date — representing a contract entered incorrectly before the effective date — then soft-deletes it. The soft-delete operation is expected to return 204 No Content, marking the contract with a deletion timestamp while preserving the record for audit integrity.
 *
 * 1. Owner joins and creates an organization.
 * 2. Owner creates a custom role for employee assignment.
 * 3. Owner invites a new employee with the custom role and full-time employment type.
 * 4. Owner creates an active, ongoing contract for the employee with a future start date.
 * 5. Owner soft-deletes the contract and receives 204 No Content.
 */
export async function test_api_contract_soft_delete_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as owner — creates organization and authenticates
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create custom role for employee assignment
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 3. Invite employee with custom role and full-time employment type
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        erp_hrm_role_id: role.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Create active, ongoing contract with future start date
  const contract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      ownerConnection,
      {
        body: {
          start_date: "2026-05-15T00:00:00.000Z",
          end_date: null,
          pay_period: "hourly",
          pay_rate: 50,
          working_hours_per_week: 40,
        },
        params: {
          employeeId: employee.id,
        },
      },
    );
  typia.assert(contract);
  // 5. Soft-delete the contract — expects 204 No Content
  await api.functional.erpHrm.member.contracts.erase(ownerConnection, {
    contractId: contract.id,
  });
}
