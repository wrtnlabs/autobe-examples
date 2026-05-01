import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_order_items_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancellation_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test administrator filtering of cancellation request snapshots by status and date range.
 *
 * Validates the PATCH endpoint for browsing cancellation request snapshot audit trails.
 * An administrator can filter snapshots by exact-match status ("approved"/"rejected"),
 * by inclusive date range bounds (created_at_from / created_at_to), and apply pagination
 * parameters (page / limit). This ensures administrators can efficiently locate specific
 * snapshots within the audit trail for dispute resolution and seller accountability review.
 *
 * 1. Admin registers, creates a category.
 * 2. Seller registers, gets admin approval, creates a product with a stocked variant.
 * 3. Customer registers, places an order with that variant, submits a cancellation request.
 * 4. Seller approves the cancellation — creating an "approved" snapshot as the audit record.
 * 5. Admin filters by status "approved" — verifies exactly one snapshot returned.
 * 6. Admin filters by status "rejected" — verifies empty result (no rejected snapshots).
 * 7. Admin filters by date range enclosing the approval moment — verifies snapshot included.
 * 8. Admin filters with created_at_from after approval — verifies empty result.
 * 9. Admin tests pagination with page=1, limit=5 — verifies pagination metadata.
 */
export async function test_api_cancellation_request_snapshot_admin_filter_by_status_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerJoinConnection, {});
  // 3. Admin approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 4. Admin creates category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 5. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerJoinConnection,
    {
      body: { shopping_mall_category_id: category.id },
    },
  );
  // 6. Seller creates variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerJoinConnection,
      {
        params: { productId: product.id },
      },
    );
  // 7. Seller adds stock to variant
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerJoinConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: { quantity_change: 10, reason: "Initial stock" },
    },
  );
  // 8. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 9. Customer places order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  // 10. Customer submits cancellation request
  const orderItem = order.items[0];
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_requests_create(
      customerConnection,
      {
        params: { itemId: orderItem.id },
      },
    );
  // 11. Seller approves cancellation — snapshot created automatically
  const beforeApproval = new Date(Date.now() - 1000).toISOString();
  await api.functional.shoppingMall.seller.cancellation_requests.update(
    sellerJoinConnection,
    {
      requestId: cancellationRequest.id,
      body: {
        status: "approved",
      } satisfies IShoppingMallCancellationRequest.IUpdate,
    },
  );
  const afterApproval = new Date(Date.now() + 1000).toISOString();
  // 12a. Filter by status "approved" — expect exactly one snapshot
  const approvedPage =
    await api.functional.shoppingMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        requestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedPage);
  TestValidator.equals(
    "approved filter — data count",
    approvedPage.data.length,
    1,
  );
  TestValidator.equals(
    "approved filter — snapshot status",
    approvedPage.data[0].status,
    "approved",
  );
  // 12b. Filter by status "rejected" — expect empty result
  const rejectedPage =
    await api.functional.shoppingMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        requestId: cancellationRequest.id,
        body: {
          status: "rejected",
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedPage);
  TestValidator.equals(
    "rejected filter — data count",
    rejectedPage.data.length,
    0,
  );
  TestValidator.equals(
    "rejected filter — pagination records",
    rejectedPage.pagination.records,
    0,
  );
  // 12c. Date range filter — inclusive bounds enclosing the approval moment
  const dateRangePage =
    await api.functional.shoppingMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        requestId: cancellationRequest.id,
        body: {
          created_at_from: beforeApproval,
          created_at_to: afterApproval,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(dateRangePage);
  TestValidator.equals(
    "date range filter — data count",
    dateRangePage.data.length,
    1,
  );
  // 12d. Date filter with created_at_from after snapshot — expect empty
  const afterOnlyPage =
    await api.functional.shoppingMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        requestId: cancellationRequest.id,
        body: {
          created_at_from: afterApproval,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(afterOnlyPage);
  TestValidator.equals(
    "after-only filter — data count",
    afterOnlyPage.data.length,
    0,
  );
  // 12e. Pagination — page 1, limit 5
  const paginatedPage =
    await api.functional.shoppingMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        requestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginatedPage);
  TestValidator.equals(
    "pagination — current page",
    paginatedPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination — limit", paginatedPage.pagination.limit, 5);
  TestValidator.equals(
    "pagination — records",
    paginatedPage.pagination.records,
    1,
  );
  TestValidator.equals("pagination — pages", paginatedPage.pagination.pages, 1);
}
