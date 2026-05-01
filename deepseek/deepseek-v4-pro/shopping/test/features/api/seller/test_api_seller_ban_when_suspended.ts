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
 * Test that banning a suspended seller clears the suspension and sets the ban timestamp.
 *
 * Validates the business rule that banning supersedes suspension. When an administrator bans a seller who is currently suspended, the suspension timestamp (suspended_at) is cleared to null while the ban timestamp (banned_at) is set to the current time. This ensures a clean state transition where the more severe restriction (ban) replaces the less severe one (suspension), and the seller can no longer log in at all.
 *
 * 1. Administrator registers and authenticates on the platform.
 * 2. Seller registers a new account, starting in pending approval status.
 * 3. Administrator approves the seller, granting full selling privileges.
 * 4. Administrator suspends the approved seller, confirming suspended_at is set.
 * 5. Administrator bans the suspended seller.
 * 6. Validates that suspended_at is cleared to null and banned_at is set to a non-null timestamp.
 */
export async function test_api_seller_ban_when_suspended(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Admin approves the seller
  const approved = await api.functional.shoppingMall.admin.sellers.approve(
    adminConnection,
    { sellerId: seller.id },
  );
  typia.assert(approved);
  TestValidator.equals(
    "seller is approved",
    approved.approval_status,
    "approved",
  );
  // 4. Admin suspends the seller
  const suspended = await api.functional.shoppingMall.admin.sellers.suspend(
    adminConnection,
    { sellerId: seller.id },
  );
  typia.assert(suspended);
  TestValidator.predicate(
    "suspended_at is set",
    suspended.suspended_at !== null,
  );
  // 5. Admin bans the suspended seller
  const banned = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    { sellerId: seller.id },
  );
  typia.assert(banned);
  // 6. Validate ban supersedes suspension
  TestValidator.equals(
    "suspended_at cleared to null",
    banned.suspended_at,
    null,
  );
  TestValidator.predicate("banned_at is set", banned.banned_at !== null);
}
