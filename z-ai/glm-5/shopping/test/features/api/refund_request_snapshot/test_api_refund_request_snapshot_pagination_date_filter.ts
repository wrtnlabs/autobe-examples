import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_refund_request_snapshot_pagination_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Setup: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customerAuth);
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Seller adds inventory stock
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 6. Customer adds item to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Customer places order (checkout)
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 8. Seller creates shipment - use variant id as placeholder for order item id
  // The mock endpoint will generate random data including orderItems
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: order.id,
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        carrier_name: "Test Carrier",
        tracking_number: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(shipment);
  // 9. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 10. Get order item ID from shipment's orderItems
  const orderItem = shipment.orderItems[0];
  if (orderItem === undefined) {
    throw new Error("Order item not found in shipment");
  }
  // Customer creates refund request
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(refundRequest);
  // 11. Seller responds to refund request (creates snapshot)
  const updatedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          decision: "approve",
        },
      },
    );
  typia.assert(updatedRefundRequest);
  // Wait a moment to ensure snapshot creation timestamp is distinct
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 12. Test: Query snapshots with date range filter
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  // Test 1: Date range filter that includes the snapshot
  const filteredSnapshots =
    await api.functional.shoppingMall.customer.refund_request_snapshots.index(
      customerConnection,
      {
        body: {
          from: oneHourAgo.toISOString() as string & tags.Format<"date-time">,
          to: oneHourLater.toISOString() as string & tags.Format<"date-time">,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // Verify snapshots are returned
  TestValidator.predicate(
    "snapshots should be returned within date range",
    filteredSnapshots.data.length > 0,
  );
  // Test 2: Verify snapshots are sorted by created_at descending
  for (let i = 1; i < filteredSnapshots.data.length; i++) {
    const prevDate = new Date(filteredSnapshots.data[i - 1].created_at);
    const currDate = new Date(filteredSnapshots.data[i].created_at);
    TestValidator.predicate(
      "snapshots should be sorted by created_at descending",
      prevDate >= currDate,
    );
  }
  // Test 3: Pagination with page=1, limit=10
  const paginatedSnapshots =
    await api.functional.shoppingMall.customer.refund_request_snapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  // Verify pagination metadata
  TestValidator.equals(
    "current page should be 1",
    paginatedSnapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be 10",
    paginatedSnapshots.pagination.limit === 10,
  );
  TestValidator.predicate(
    "records should be non-negative",
    paginatedSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    paginatedSnapshots.pagination.pages >= 0,
  );
  // Test 4: Date range filter that excludes all snapshots (far future)
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year in future
  const furtherFuture = new Date(farFuture.getTime() + 24 * 60 * 60 * 1000); // 1 day later
  const emptySnapshots =
    await api.functional.shoppingMall.customer.refund_request_snapshots.index(
      customerConnection,
      {
        body: {
          from: farFuture.toISOString() as string & tags.Format<"date-time">,
          to: furtherFuture.toISOString() as string & tags.Format<"date-time">,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(emptySnapshots);
  // Verify empty result set
  TestValidator.equals(
    "empty result set should have no data",
    emptySnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "empty result set should have 0 records",
    emptySnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result set should have 0 pages",
    emptySnapshots.pagination.pages,
    0,
  );
  // Test 5: Maximum limit enforcement (limit=100)
  const maxLimitSnapshots =
    await api.functional.shoppingMall.customer.refund_request_snapshots.index(
      customerConnection,
      {
        body: {
          limit: 100,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(maxLimitSnapshots);
  TestValidator.equals(
    "maximum limit should be 100",
    maxLimitSnapshots.pagination.limit,
    100,
  );
  // Test 6: Verify customer data isolation - query should only return customer's own snapshots
  TestValidator.predicate(
    "customer should only see their own snapshots",
    filteredSnapshots.data.every((snapshot) => {
      const snapshotCustomerId = snapshot.refundRequest.customer?.id;
      return snapshotCustomerId === customerAuth.id;
    }),
  );
}
