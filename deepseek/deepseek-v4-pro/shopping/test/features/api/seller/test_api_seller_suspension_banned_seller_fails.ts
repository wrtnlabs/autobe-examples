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
 * Test that suspending a banned seller fails with an appropriate error.
 *
 * Validates that the system's enforcement hierarchy correctly prevents conflicting
 * administrative actions. Banning is a stricter enforcement measure that supersedes
 * suspension — once a seller is banned, the suspend endpoint must reject the request
 * because its pre-conditions require banned_at IS NULL.
 *
 * 1. Administrator registers and authenticates via admin join.
 * 2. Seller account is created via seller join (starts in pending state).
 * 3. Administrator approves the seller, granting full selling privileges.
 * 4. Administrator bans the seller — banned_at is set, suspended_at is cleared.
 * 5. Verify the ban response confirms banned_at is present and suspended_at is null.
 * 6. Attempt to suspend the banned seller — the request must be rejected with an error.
 */
export async function test_api_seller_suspension_banned_seller_fails(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Administrator approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Administrator bans the seller
  const bannedSeller = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    {
      sellerId: seller.id,
    },
  );
  typia.assert(bannedSeller);
  // 5. Verify ban enforcement state
  TestValidator.predicate(
    "banned seller has banned_at set",
    bannedSeller.banned_at !== null,
  );
  TestValidator.predicate(
    "banned seller has suspended_at null",
    bannedSeller.suspended_at === null,
  );
  // 6. Attempt to suspend the banned seller — must be rejected
  await TestValidator.error("cannot suspend banned seller", async () => {
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId: seller.id,
    });
  });
}
