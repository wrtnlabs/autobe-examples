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
 * Test that an administrator can retrieve the account details of a banned seller.
 *
 * Verifies the business rule that banning a seller restricts login access but does not destroy or hide account data that administrators need for oversight, audit trails, and dispute resolution. The administrator should still be able to access all seller account fields and the nested profile after banning.
 *
 * 1. Administrator registers and authenticates via admin join.
 * 2. Seller registers and authenticates via seller join.
 * 3. Administrator approves the seller's pending registration.
 * 4. Administrator bans the approved seller.
 * 5. Administrator retrieves the banned seller's account details.
 * 6. Validates that banned_at is a non-null ISO 8601 timestamp.
 * 7. Validates that approval_status remains 'approved', rejection_reason is null, suspended_at is null, and the email is preserved.
 */
export async function test_api_seller_detail_banned_seller_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves the seller
  const approved = await api.functional.shoppingMall.admin.sellers.approve(
    adminConnection,
    { sellerId: seller.id },
  );
  typia.assert(approved);
  // 4. Admin bans the seller
  const banned = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    { sellerId: seller.id },
  );
  typia.assert(banned);
  // 5. Admin retrieves the banned seller's account details
  const retrieved = await api.functional.shoppingMall.admin.sellers.at(
    adminConnection,
    { sellerId: seller.id },
  );
  typia.assert(retrieved);
  // 6. Validate banned_at is set
  TestValidator.predicate("banned_at is set", retrieved.banned_at !== null);
  // 7. Validate other fields are preserved
  TestValidator.equals("email preserved", retrieved.email, seller.email);
  TestValidator.equals(
    "approval_status is approved",
    retrieved.approval_status,
    "approved",
  );
  TestValidator.equals(
    "rejection_reason is null",
    retrieved.rejection_reason,
    null,
  );
  TestValidator.equals("suspended_at is null", retrieved.suspended_at, null);
}
