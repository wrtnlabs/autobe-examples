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
 * Test that an administrator can successfully unban a previously banned seller.
 *
 * Validates the complete seller unban workflow: administrator registration, seller registration and approval, seller banning to establish the prerequisite state, and finally the unban operation. The core assertion verifies that unbanning clears only the banned_at timestamp while preserving all other seller account data — email, approval_status, rejection_reason, suspended_at, created_at, deleted_at, and profile fields (shop_name, shop_description, logo_image_uri) — in their exact pre-unban state.
 *
 * The updated_at timestamp is expected to be refreshed to reflect the unban operation, confirming the change was recorded. The deleted_at field must remain null, confirming the seller account was not soft-deleted.
 *
 * 1. Administrator registers and authenticates on the platform.
 * 2. Seller registers an account.
 * 3. Administrator approves the seller's pending registration.
 * 4. Administrator bans the approved seller — capture the banned state as pre-unban reference.
 * 5. Administrator unbans the seller.
 * 6. Validates banned_at is null and all other fields match pre-unban state.
 * 7. Validates updated_at has been refreshed after the unban operation.
 */
export async function test_api_seller_unban_successful_restoration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Administrator approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Administrator bans the seller — capture banned state as pre-unban reference
  const bannedSeller = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    { sellerId: seller.id },
  );
  typia.assert(bannedSeller);
  TestValidator.predicate(
    "seller is banned before unban",
    bannedSeller.banned_at !== null,
  );
  // 5. Administrator unbans the seller
  const unbannedSeller = await api.functional.shoppingMall.admin.sellers.unban(
    adminConnection,
    { sellerId: seller.id },
  );
  typia.assert(unbannedSeller);
  // 6. Validate banned_at is now null
  TestValidator.equals(
    "banned_at is null after unban",
    unbannedSeller.banned_at,
    null,
  );
  // 7. Validate updated_at has been refreshed
  TestValidator.notEquals(
    "updated_at refreshed after unban",
    unbannedSeller.updated_at,
    bannedSeller.updated_at,
  );
  // 8. Validate all other fields remain unchanged from pre-unban state
  TestValidator.equals(
    "email preserved",
    unbannedSeller.email,
    bannedSeller.email,
  );
  TestValidator.equals(
    "approval_status preserved",
    unbannedSeller.approval_status,
    bannedSeller.approval_status,
  );
  TestValidator.equals(
    "rejection_reason preserved",
    unbannedSeller.rejection_reason,
    bannedSeller.rejection_reason,
  );
  TestValidator.equals(
    "suspended_at preserved",
    unbannedSeller.suspended_at,
    bannedSeller.suspended_at,
  );
  TestValidator.equals(
    "created_at preserved",
    unbannedSeller.created_at,
    bannedSeller.created_at,
  );
  TestValidator.equals("deleted_at is null", unbannedSeller.deleted_at, null);
  TestValidator.equals(
    "profile.shop_name preserved",
    unbannedSeller.profile.shop_name,
    bannedSeller.profile.shop_name,
  );
  TestValidator.equals(
    "profile.shop_description preserved",
    unbannedSeller.profile.shop_description,
    bannedSeller.profile.shop_description,
  );
  TestValidator.equals(
    "profile.logo_image_uri preserved",
    unbannedSeller.profile.logo_image_uri,
    bannedSeller.profile.logo_image_uri,
  );
}
