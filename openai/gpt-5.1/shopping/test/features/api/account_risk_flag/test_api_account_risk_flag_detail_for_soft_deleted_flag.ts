import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that account risk flag detail endpoint fails after hard deletion.
 *
 * Business workflow:
 *
 * 1. Join as an admin to obtain an authenticated admin context.
 * 2. Create a new account risk flag via the admin create endpoint.
 * 3. Fetch the created risk flag via the detail endpoint and verify IDs match.
 * 4. Permanently delete the risk flag via the erase endpoint.
 * 5. Attempt to fetch the deleted risk flag again and validate that an error is
 *    thrown.
 */
export async function test_api_account_risk_flag_detail_for_soft_deleted_flag(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authenticated context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new account risk flag
  const createdFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: {
          actor_type: "customer",
          code: RandomGenerator.alphaNumeric(16),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          severity: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "critical",
          ] as const),
          active: true,
          expires_at: null,
        } satisfies IShoppingMallAccountRiskFlag.ICreate,
      },
    );
  typia.assert(createdFlag);

  // 3. Verify detail endpoint can retrieve the created risk flag
  const fetchedFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.at(connection, {
      riskFlagId: createdFlag.id,
    });
  typia.assert(fetchedFlag);
  TestValidator.equals(
    "created and fetched risk flag IDs must match",
    fetchedFlag.id,
    createdFlag.id,
  );

  // 4. Permanently delete the risk flag
  await api.functional.shoppingMall.admin.accountRiskFlags.erase(connection, {
    riskFlagId: createdFlag.id,
  });

  // 5. Ensure fetching the deleted risk flag results in an error
  await TestValidator.error(
    "detail endpoint should fail for a deleted risk flag ID",
    async () => {
      await api.functional.shoppingMall.admin.accountRiskFlags.at(connection, {
        riskFlagId: createdFlag.id,
      });
    },
  );
}
