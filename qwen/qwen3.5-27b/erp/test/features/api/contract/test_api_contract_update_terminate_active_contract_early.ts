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
 * Test terminating an active contract early by setting an end date in the past.
 *
 * This test validates the contract termination workflow:
 * 1. Authenticate as admin
 * 2. Create an active contract (no end date)
 * 3. Terminate the contract by setting end_at to a past date
 * 4. Verify the contract is now inactive
 * 5. Verify the contract becomes immutable (subsequent updates fail)
 * 6. Verify a new active contract can be created for the same employee
 */
export async function test_api_contract_update_terminate_active_contract_early(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@hrmplatform.test",
      password: "admin1234",
      href: "https://hrmplatform.test/admin/join",
      referrer: "https://hrmplatform.test",
      ip: "192.168.1.100",
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create an active contract (no end_at = ongoing employment)
  const activeContract = await generate_random_hrm_platform_contracts_create(
    adminConnection,
    {
      body: {
        end_at: null, // No end date = active contract
      },
    },
  );
  typia.assert(activeContract);
  // Verify initial state: contract is active (end_at is null)
  TestValidator.equals(
    "initial contract has no end date",
    activeContract.end_at,
    null,
  );
  // 3. Terminate the contract by setting end_at to a past date (yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const pastEndDate = yesterday.toISOString();
  const terminatedContract = await api.functional.hrmPlatform.contracts.update(
    adminConnection,
    {
      contractId: activeContract.id,
      body: {
        end_at: pastEndDate,
      } satisfies IHrmPlatformContract.IUpdate,
    },
  );
  typia.assert(terminatedContract);
  // 4. Verify the contract is now terminated (end_at is set to past date)
  TestValidator.equals(
    "contract end date is set to past date",
    terminatedContract.end_at,
    pastEndDate,
  );
  // Verify the contract end date is in the past
  TestValidator.predicate(
    "contract end date is before current time",
    new Date(terminatedContract.end_at!).getTime() < Date.now(),
  );
  // 5. Verify the contract becomes immutable (subsequent update should fail)
  await TestValidator.error(
    "terminated contract cannot be updated",
    async () => {
      await api.functional.hrmPlatform.contracts.update(adminConnection, {
        contractId: terminatedContract.id,
        body: {
          pay_rate: 999999,
        } satisfies IHrmPlatformContract.IUpdate,
      });
    },
  );
  // 6. Verify a new active contract can be created for the same employee
  const newStartDate = new Date();
  newStartDate.setDate(newStartDate.getDate() + 1); // Tomorrow
  const newActiveContract = await generate_random_hrm_platform_contracts_create(
    adminConnection,
    {
      body: {
        employee_id: terminatedContract.employee.id,
        start_at: newStartDate.toISOString(),
        end_at: null, // New active contract
        pay_rate: terminatedContract.pay_rate * 1.1, // 10% raise
        pay_period: terminatedContract.pay_period,
        working_hours_per_week: terminatedContract.working_hours_per_week,
      } satisfies IHrmPlatformContract.ICreate,
    },
  );
  typia.assert(newActiveContract);
  // Verify the new contract is active
  TestValidator.equals(
    "new contract is active (no end date)",
    newActiveContract.end_at,
    null,
  );
  // Verify the new contract belongs to the same employee
  TestValidator.equals(
    "new contract belongs to same employee",
    newActiveContract.employee.id,
    terminatedContract.employee.id,
  );
  // Verify the new contract has the updated pay rate
  TestValidator.equals(
    "new contract has updated pay rate",
    newActiveContract.pay_rate,
    terminatedContract.pay_rate * 1.1,
  );
}
