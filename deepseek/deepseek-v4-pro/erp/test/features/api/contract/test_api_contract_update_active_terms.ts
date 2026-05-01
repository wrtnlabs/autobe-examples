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
 * Test updating an active employee contract's compensation terms.
 *
 * Validates that an authorized member with employee:manage permission can successfully
 * update the currently active contract for an employee. The test verifies that all
 * modified fields are correctly applied while unchanged fields remain intact.
 *
 * 1. Authenticate as a new member via join, establishing organization context.
 * 2. Create a custom role granted the employee:manage permission.
 * 3. Create an employee assigned to the custom role within the organization.
 * 4. Create an initial active contract for the employee with randomized terms.
 * 5. Update the contract: change pay_rate to a new random value, flip pay_period
 *    to a different classification, adjust working_hours_per_week, and add notes.
 * 6. Validate the updated contract reflects all changed fields, start_date and
 *    end_date remain as originally set, created_at is immutable, and updated_at
 *    has been refreshed to a later timestamp.
 */
export async function test_api_contract_update_active_terms(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a role with employee:manage permission
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {
    body: {
      permissions: ["employee:manage"],
    },
  });
  typia.assert(role);
  // 3. Create an employee with the role
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create an initial active contract
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
  // 5. Prepare update values — distinct from original to verify changes
  const newPayRate =
    (typia.random<number & tags.Type<"uint32">>() satisfies number as number) +
    10;
  const newPayPeriod = contract.pay_period === "hourly" ? "weekly" : "hourly";
  const newWorkingHours =
    (typia.random<number & tags.Type<"uint32">>() satisfies number as number) +
    5;
  const newNotes = RandomGenerator.paragraph({ sentences: 3 });
  // 6. Update the active contract
  const updatedContract = await api.functional.erpHrm.member.contracts.update(
    memberConnection,
    {
      contractId: contract.id,
      body: {
        pay_rate: newPayRate,
        pay_period: newPayPeriod,
        working_hours_per_week: newWorkingHours,
        notes: newNotes,
      } satisfies IErpHrmContract.IUpdate,
    },
  );
  typia.assert(updatedContract);
  // 7. Validate updated fields
  TestValidator.equals(
    "contract id unchanged",
    updatedContract.id,
    contract.id,
  );
  TestValidator.equals(
    "start_date unchanged",
    updatedContract.start_date,
    contract.start_date,
  );
  TestValidator.equals(
    "end_date unchanged",
    updatedContract.end_date,
    contract.end_date,
  );
  TestValidator.equals(
    "created_at immutable",
    updatedContract.created_at,
    contract.created_at,
  );
  TestValidator.equals(
    "pay_rate updated",
    updatedContract.pay_rate,
    newPayRate,
  );
  TestValidator.equals(
    "pay_period updated",
    updatedContract.pay_period,
    newPayPeriod,
  );
  TestValidator.equals(
    "working_hours_per_week updated",
    updatedContract.working_hours_per_week,
    newWorkingHours,
  );
  TestValidator.equals("notes updated", updatedContract.notes, newNotes);
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedContract.updated_at,
    contract.updated_at,
  );
  TestValidator.equals(
    "employee unchanged",
    updatedContract.employee.id,
    contract.employee.id,
  );
}
