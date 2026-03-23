import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_contracts_create } from "../../../generate/generate_random_hrm_platform_contracts_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";

/**
 * Test updating an active employee contract with new compensation terms.
 *
 * 1. Authenticate as admin with employee management permissions
 * 2. Create an active contract for an employee with initial compensation terms
 * 3. Update the contract with new pay_rate
 * 4. Verify the updated contract contains the new pay_rate
 * 5. Verify all other fields remain unchanged
 * 6. Verify the contract remains active
 */
export async function test_api_contract_update_active_contract_compensation_terms(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create an active contract with initial compensation terms
  const initialPayRate = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<30000> & tags.Maximum<50000>
  >();
  const contract = await generate_random_hrm_platform_contracts_create(
    adminConnection,
    {
      body: {
        pay_rate: initialPayRate,
        pay_period: "monthly",
        working_hours_per_week: 40,
        start_at: new Date().toISOString(),
        end_at: null,
      },
    },
  );
  typia.assert(contract);
  // Store original values for comparison
  const originalCreatedAt = contract.created_at;
  const originalEmployeeId = contract.employee.id;
  const originalOrganizationId = contract.organization.id;
  const originalPayPeriod = contract.pay_period;
  const originalWorkingHours = contract.working_hours_per_week;
  const originalStartAt = contract.start_at;
  // 3. Update the contract with new compensation terms
  const newPayRate = initialPayRate + 10000;
  const updatedContract = await api.functional.hrmPlatform.contracts.update(
    adminConnection,
    {
      contractId: contract.id,
      body: {
        pay_rate: newPayRate,
      },
    },
  );
  typia.assert(updatedContract);
  // 4. Verify the updated contract contains the new pay_rate
  TestValidator.equals(
    "pay_rate updated",
    updatedContract.pay_rate,
    newPayRate,
  );
  // 5. Verify all other fields remain unchanged
  TestValidator.equals(
    "employee unchanged",
    updatedContract.employee.id,
    originalEmployeeId,
  );
  TestValidator.equals(
    "organization unchanged",
    updatedContract.organization.id,
    originalOrganizationId,
  );
  TestValidator.equals(
    "pay_period unchanged",
    updatedContract.pay_period,
    originalPayPeriod,
  );
  TestValidator.equals(
    "working_hours_per_week unchanged",
    updatedContract.working_hours_per_week,
    originalWorkingHours,
  );
  TestValidator.equals(
    "start_at unchanged",
    updatedContract.start_at,
    originalStartAt,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedContract.created_at,
    originalCreatedAt,
  );
  // 6. Verify the contract remains active (end_at is still null)
  TestValidator.equals("contract remains active", updatedContract.end_at, null);
  // 7. Verify updated_at is after created_at
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedContract.updated_at).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
}
