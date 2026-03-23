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
 * Test that historical contracts (with past end dates) cannot be updated.
 *
 * This test verifies that once a contract has ended (end_at in the past),
 * it becomes an immutable historical record to preserve accurate employment
 * history for compliance and auditing purposes.
 */
export async function test_api_contract_update_historical_contract_immutability(
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
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create a historical contract with past end date
  const historicalContract =
    await generate_random_hrm_platform_contracts_create(adminConnection, {
      body: {
        end_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      },
    });
  typia.assert(historicalContract);
  // 3. Attempt to update the historical contract (should fail)
  await TestValidator.error(
    "historical contract update should be rejected",
    async () => {
      await api.functional.hrmPlatform.contracts.update(adminConnection, {
        contractId: historicalContract.id,
        body: {
          pay_rate: historicalContract.pay_rate * 1.1, // Attempt 10% increase
        } satisfies IHrmPlatformContract.IUpdate,
      });
    },
  );
  // 4. Verify the contract remains unchanged by fetching it again
  // Note: We need to verify immutability - the contract should still have original values
  // Since there's no GET endpoint provided, we verify by ensuring the update failed
  // and the error was thrown as expected
  TestValidator.predicate(
    "historical contract end_at is in the past",
    new Date(historicalContract.end_at!).getTime() < Date.now(),
  );
}
