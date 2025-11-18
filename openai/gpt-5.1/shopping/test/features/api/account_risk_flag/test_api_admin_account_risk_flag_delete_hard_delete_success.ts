import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate hard deletion behavior for admin-managed account risk flags.
 *
 * Business intent
 *
 * - Ensure an authenticated administrator can create an account risk flag, delete
 *   it via the admin DELETE endpoint, and observe that it is no longer
 *   retrievable afterwards.
 * - Confirm that deletion is not treated as silently idempotent: once a flag is
 *   deleted, subsequent attempts to access or delete it again should surface
 *   errors rather than succeed as no-ops.
 *
 * Step-by-step scenario
 *
 * 1. Bootstrap an administrator account via POST /auth/admin/join to obtain an
 *    authenticated admin context (token is wired into `connection` by the
 *    SDK).
 * 2. Using the admin context, create a new account risk flag via POST
 *    /shoppingMall/admin/accountRiskFlags with a valid
 *    IShoppingMallAccountRiskFlag.ICreate body.
 * 3. Read back the created flag via GET
 *    /shoppingMall/admin/accountRiskFlags/{riskFlagId} to prove it exists.
 * 4. Invoke DELETE /shoppingMall/admin/accountRiskFlags/{riskFlagId} to erase the
 *    record.
 * 5. Attempt to read the same riskFlagId again and expect the call to fail,
 *    demonstrating that the record has been removed from observable state.
 * 6. Attempt to delete the same riskFlagId again and expect the call to fail,
 *    confirming that repeated deletes are not treated as successful idempotent
 *    operations once the record is gone.
 */
export async function test_api_admin_account_risk_flag_delete_hard_delete_success(
  connection: api.IConnection,
) {
  // 1. Bootstrap admin via join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Optional IP: sometimes provided by client; here we omit for simplicity
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new risk flag as this admin
  const riskFlagCreateBody = {
    actor_type: "customer",
    code: `TEST_RISK_${RandomGenerator.alphabets(8)}`,
    reason: RandomGenerator.paragraph({ sentences: 5 }),
    severity: "high",
    active: true,
    // Leave expires_at undefined to represent a non-expiring flag
    expires_at: undefined,
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const createdFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: riskFlagCreateBody,
      },
    );
  typia.assert<IShoppingMallAccountRiskFlag>(createdFlag);

  const riskFlagId = createdFlag.id;

  // 3. Verify risk flag exists via GET before deletion
  const fetchedBeforeDelete =
    await api.functional.shoppingMall.admin.accountRiskFlags.at(connection, {
      riskFlagId,
    });
  typia.assert<IShoppingMallAccountRiskFlag>(fetchedBeforeDelete);
  TestValidator.equals(
    "created risk flag id should match fetched id before delete",
    fetchedBeforeDelete.id,
    riskFlagId,
  );

  // 4. Perform deletion via DELETE
  await api.functional.shoppingMall.admin.accountRiskFlags.erase(connection, {
    riskFlagId,
  });

  // 5. Confirm the risk flag can no longer be retrieved (expect error)
  await TestValidator.error(
    "fetching deleted risk flag should fail",
    async () => {
      await api.functional.shoppingMall.admin.accountRiskFlags.at(connection, {
        riskFlagId,
      });
    },
  );

  // 6. Confirm repeated delete is not silently idempotent (expect error)
  await TestValidator.error(
    "re-deleting already deleted risk flag should fail",
    async () => {
      await api.functional.shoppingMall.admin.accountRiskFlags.erase(
        connection,
        {
          riskFlagId,
        },
      );
    },
  );
}
