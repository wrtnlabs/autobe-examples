import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an administrator can filter seller sessions by active expiration status.
 *
 * Validates the session filtering endpoint by confirming that when an administrator requests a seller's session list with the `expiration_status` filter set to `"active"`, only sessions whose `expired_at` timestamp is in the future are returned. Ensures that no expired sessions leak into the filtered results.
 *
 * 1. A seller registers via `authorize_seller_join`, which creates an active session automatically.
 * 2. An administrator registers via `authorize_admin_join` to obtain privileged access.
 * 3. The admin queries the seller's sessions with `expiration_status: "active"`.
 * 4. Validates that every returned session has an `expired_at` timestamp in the future.
 * 5. Validates that pagination metadata reflects the filtered active-only count.
 */
export async function test_api_admin_seller_sessions_filter_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration — creates an active session automatically
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 2. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Admin queries seller sessions filtered to active only
  const activeSessions =
    await api.functional.shoppingMall.admin.sellers.sessions.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          expiration_status: "active",
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // 4. Validate all returned sessions are truly active (expired_at in the future)
  const now = new Date().toISOString();
  for (const session of activeSessions.data) {
    TestValidator.predicate(
      "session is active (expired_at in the future)",
      session.expired_at > now,
    );
  }
  // 5. Validate pagination metadata reflects filtered results
  TestValidator.predicate(
    "pagination records count is at least 1",
    activeSessions.pagination.records >= 1,
  );
  TestValidator.equals(
    "pagination limit matches data length or is greater",
    activeSessions.pagination.limit >= activeSessions.data.length,
    true,
  );
}
