import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
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
 * Verify that an approved seller who has not yet created any products receives
 * a dashboard with all four counts returning zero without errors.
 *
 * This test confirms the dashboard gracefully handles an empty shop. The
 * specification requires all counts return 0 when the seller has no products,
 * no order items, no pending cancellations, and no pending refunds. The
 * dashboard endpoint is accessible only to approved sellers.
 *
 * 1. Administrator registers on the platform with randomized credentials.
 * 2. Seller registers on the platform with randomized credentials, starting in
 *    pending approval status.
 * 3. Administrator approves the seller's pending registration, transitioning
 *    approval_status to "approved".
 * 4. The approved seller retrieves their dashboard via the GET endpoint.
 * 5. Validates that products_count, order_items_count,
 *    pending_cancellations_count, and pending_refunds_count are all zero,
 *    confirming the empty-shop edge case is handled without errors.
 */
export async function test_api_seller_dashboard_approved_empty_shop(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Seller registration (starts in pending status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Administrator approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Approved seller retrieves dashboard
  const dashboard =
    await api.functional.shoppingMall.seller.dashboard.at(sellerConnection);
  typia.assert(dashboard);
  // 5. Validate all counts are zero for empty shop
  TestValidator.equals("products count", dashboard.products_count, 0);
  TestValidator.equals("order items count", dashboard.order_items_count, 0);
  TestValidator.equals(
    "pending cancellations count",
    dashboard.pending_cancellations_count,
    0,
  );
  TestValidator.equals(
    "pending refunds count",
    dashboard.pending_refunds_count,
    0,
  );
}
