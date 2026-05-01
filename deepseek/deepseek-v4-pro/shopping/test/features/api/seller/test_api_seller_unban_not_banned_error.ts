import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
 * Test that unbanning a seller who has never been banned returns HTTP 400.
 *
 * Verifies the idempotency guard on the unban endpoint: calling unban on a seller
 * whose banned_at has always been null must fail with a 400 error, not silently
 * succeed or treat the request as a no-op.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Seller registers via authorize_seller_join and is approved by the admin.
 * 3. Admin attempts to unban the never-banned seller — expects HTTP 400.
 * 4. Validates the error response contains an appropriate message.
 */
export async function test_api_seller_unban_not_banned_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Register a seller (starts in "pending" approval, banned_at = null)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Admin approves the seller — seller is now active but never banned
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Attempt to unban the never-banned seller — must fail with 400
  await TestValidator.httpError(
    "unban never-banned seller returns 400",
    400,
    async () =>
      await api.functional.shoppingMall.admin.sellers.unban(adminConnection, {
        sellerId: approvedSeller.id,
      }),
  );
}
