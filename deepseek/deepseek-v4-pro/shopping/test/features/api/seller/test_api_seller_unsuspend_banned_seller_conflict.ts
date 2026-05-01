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
 * Verify that a banned seller cannot be unsuspended, preserving the enforcement hierarchy between ban and suspension.
 *
 * Tests the administrative enforcement workflow that establishes the precedence of banning over suspension. When a seller is banned, the unsuspension operation must reject the request with 409 Conflict because the ban must be lifted separately before unsuspension can take effect.
 *
 * The test confirms that banning clears the suspension state (ban supersedes suspension per the API specification) and that subsequent unsuspension attempts on a banned seller are rejected, ensuring the seller cannot bypass the ban through unsuspension.
 *
 * 1. Administrator registers and authenticates on the platform.
 * 2. Seller registers a new account with randomized credentials.
 * 3. Administrator approves the pending seller registration, granting selling privileges.
 * 4. Administrator suspends the approved seller, hiding products from marketplace.
 * 5. Administrator bans the suspended seller — ban supersedes suspension, clearing suspended_at.
 * 6. Administrator attempts to unsuspend the banned seller — expected to fail with 409 Conflict.
 * 7. Validates that the seller's banned state persists with banned_at set and suspended_at null.
 */
export async function test_api_seller_unsuspend_banned_seller_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Administrator approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "approval status is approved",
    approvedSeller.approval_status,
    "approved",
  );
  // 4. Administrator suspends the seller
  const suspendedSeller =
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(suspendedSeller);
  TestValidator.predicate(
    "seller is suspended",
    suspendedSeller.suspended_at !== null,
  );
  // 5. Administrator bans the seller — ban supersedes suspension, clearing suspended_at
  const bannedSeller = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    {
      sellerId: seller.id,
    },
  );
  typia.assert(bannedSeller);
  TestValidator.predicate("seller is banned", bannedSeller.banned_at !== null);
  TestValidator.equals(
    "ban cleared suspended_at",
    bannedSeller.suspended_at,
    null,
  );
  // 6. Attempt to unsuspend the banned seller — must fail with 409 Conflict
  await TestValidator.httpError(
    "cannot unsuspend banned seller",
    409,
    async () => {
      await api.functional.shoppingMall.admin.sellers.unsuspend(
        adminConnection,
        { sellerId: seller.id },
      );
    },
  );
  // 7. Validate that the seller remains in the banned state
  TestValidator.predicate(
    "banned_at still set after failed unsuspend",
    bannedSeller.banned_at !== null,
  );
  TestValidator.equals(
    "suspended_at still null after failed unsuspend",
    bannedSeller.suspended_at,
    null,
  );
}
