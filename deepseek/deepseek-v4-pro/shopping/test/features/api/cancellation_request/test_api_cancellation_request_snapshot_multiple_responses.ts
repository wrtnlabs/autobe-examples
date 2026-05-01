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
 * Test cancellation request snapshot listing after multiple seller responses.
 *
 * Validates that when a seller responds to cancellation requests for the same order item twice — first rejecting the initial request, then approving a resubmitted request — the snapshot listing endpoint returns both historical records in reverse chronological order.
 *
 * Each snapshot must be immutable and preserve the reason text and status at the moment of the corresponding seller decision, forming a complete audit trail for dispute resolution.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, receives admin approval, creates a product with variant and initial stock.
 * 3. Customer registers and places an order for the variant.
 * 4. Customer submits a first cancellation request with a specific reason.
 * 5. Seller rejects the first cancellation request, creating a snapshot with "rejected" status.
 * 6. Customer submits a second cancellation request for the same order item (still in "paid" status).
 * 7. Seller approves the second cancellation request, creating a snapshot with "approved" status.
 * 8. Customer queries the snapshot endpoint using the second cancellation request ID.
 * 9. Validates 2 snapshots returned, newest first: approved snapshot with second reason, then rejected snapshot with first reason. Pagination metadata confirms page 1, total 2 records, default limit of 20.
 */
export async function test_api_cancellation_request_snapshot_multiple_responses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
    },
  );
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            variant_id: variant.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  const orderItem = order.items[0];
  // 4. First cancellation request
  const firstReason = RandomGenerator.paragraph({ sentences: 3 });
  const firstCancellation =
    await generate_random_shopping_mall_customer_order_items_cancellation_requests_create(
      customerConnection,
      {
        params: { itemId: orderItem.id },
        body: { reason: firstReason },
      },
    );
  typia.assert(firstCancellation);
  // 5. Seller rejects first request
  await api.functional.shoppingMall.seller.cancellation_requests.update(
    sellerConnection,
    {
      requestId: firstCancellation.id,
      body: {
        status: "rejected",
      } satisfies IShoppingMallCancellationRequest.IUpdate,
    },
  );
  // 6. Second cancellation request
  const secondReason = RandomGenerator.paragraph({ sentences: 3 });
  const secondCancellation =
    await generate_random_shopping_mall_customer_order_items_cancellation_requests_create(
      customerConnection,
      {
        params: { itemId: orderItem.id },
        body: { reason: secondReason },
      },
    );
  typia.assert(secondCancellation);
  // 7. Seller approves second request
  await api.functional.shoppingMall.seller.cancellation_requests.update(
    sellerConnection,
    {
      requestId: secondCancellation.id,
      body: {
        status: "approved",
      } satisfies IShoppingMallCancellationRequest.IUpdate,
    },
  );
  // 8. Customer retrieves snapshots
  const snapshotPage =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        requestId: secondCancellation.id,
        body: {} satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  const snapshots = snapshotPage.data;
  // 9. Validate count and pagination
  TestValidator.equals("snapshot count", snapshots.length, 2);
  TestValidator.equals(
    "pagination current page",
    snapshotPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total records",
    snapshotPage.pagination.records,
    2,
  );
  TestValidator.equals("pagination limit", snapshotPage.pagination.limit, 20);
  // Newest snapshot (index 0) should be "approved"
  TestValidator.equals(
    "newest snapshot status",
    snapshots[0].status,
    "approved",
  );
  TestValidator.equals(
    "newest snapshot reason",
    snapshots[0].reason,
    secondReason,
  );
  // Older snapshot (index 1) should be "rejected"
  TestValidator.equals(
    "older snapshot status",
    snapshots[1].status,
    "rejected",
  );
  TestValidator.equals(
    "older snapshot reason",
    snapshots[1].reason,
    firstReason,
  );
}
