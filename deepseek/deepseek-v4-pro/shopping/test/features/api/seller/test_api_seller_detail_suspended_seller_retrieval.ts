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
 * Test that an administrator can retrieve a suspended seller's full account details
 * and verify the suspension state is correctly reflected.
 *
 * Validates that administrative access to seller account data remains fully intact
 * after suspension — all identity fields (email, id), approval workflow state
 * (approval_status, rejection_reason), enforcement timestamps (suspended_at, banned_at),
 * lifecycle timestamps (created_at, updated_at), and the nested shop profile are
 * returned without restriction. Suspension hides products from the marketplace but
 * does not block administrative oversight of the account itself.
 *
 * 1. Administrator registers and authenticates via join.
 * 2. Seller registers and authenticates via join.
 * 3. Administrator approves the pending seller registration.
 * 4. Administrator suspends the approved seller.
 * 5. Administrator retrieves the suspended seller's account details by ID.
 * 6. Validates suspended_at is a non-null ISO 8601 timestamp confirming active suspension,
 *    approval_status remains "approved", banned_at and rejection_reason remain null,
 *    and all core identity and profile fields are present.
 */
export async function test_api_seller_detail_suspended_seller_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Seller registers
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Administrator approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Administrator suspends the seller
  const suspendedSeller =
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(suspendedSeller);
  // 5. Administrator retrieves the seller's account details
  const retrievedSeller = await api.functional.shoppingMall.admin.sellers.at(
    adminConnection,
    { sellerId: seller.id },
  );
  typia.assert(retrievedSeller);
  // 6. Validate suspension state and account integrity
  TestValidator.equals("id matches", retrievedSeller.id, seller.id);
  TestValidator.equals("email preserved", retrievedSeller.email, seller.email);
  TestValidator.equals(
    "approval_status is approved",
    retrievedSeller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "rejection_reason is null",
    retrievedSeller.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "suspended_at is set to a non-null ISO 8601 timestamp",
    retrievedSeller.suspended_at !== null,
  );
  TestValidator.equals("banned_at is null", retrievedSeller.banned_at, null);
}
