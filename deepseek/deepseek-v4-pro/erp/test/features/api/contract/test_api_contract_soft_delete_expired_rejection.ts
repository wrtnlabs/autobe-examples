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
 * Verify that an expired contract whose end date has passed cannot be soft-deleted.
 *
 * Validates that the contract soft-deletion endpoint rejects attempts to delete
 * contracts whose end_date is in the past. Expired contracts are preserved as
 * immutable historical records for auditing and compliance purposes.
 *
 * The test creates an expired contract with both start_date and end_date set
 * well in the past (2025-01-01 to 2025-06-01, while the current date is
 * 2026-05-01), then attempts to soft-delete it. The server must respond with
 * 409 Conflict to indicate the contract cannot be deleted because it has
 * already expired.
 *
 * 1. Owner joins the platform, creating an organization and authenticating.
 * 2. Owner creates a custom role with employee management permissions.
 * 3. Owner invites a new employee with the custom role and full-time type.
 * 4. Owner creates a past-dated contract for the employee, which is expired.
 * 5. Attempt to soft-delete the expired contract — expects 409 Conflict.
 */
export async function test_api_contract_soft_delete_expired_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member to authenticate and create an organization
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a custom role with employee management permissions
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 3. Invite a new employee with the created role and full-time employment type
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
  // 4. Create a contract with past dates — the contract is expired
  const contract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      ownerConnection,
      {
        body: {
          start_date: "2025-01-01T00:00:00.000Z",
          end_date: "2025-06-01T00:00:00.000Z",
          pay_rate: 25,
          pay_period: "hourly",
          working_hours_per_week: 40,
        },
        params: { employeeId: employee.id },
      },
    );
  typia.assert(contract);
  // 5. Attempt to soft-delete the expired contract — must fail with 409 Conflict
  await TestValidator.httpError(
    "expired contract cannot be deleted",
    409,
    async () => {
      await api.functional.erpHrm.member.contracts.erase(ownerConnection, {
        contractId: contract.id,
      });
    },
  );
}
