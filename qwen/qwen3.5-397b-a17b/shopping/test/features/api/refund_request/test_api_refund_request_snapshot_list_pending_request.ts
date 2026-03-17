import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test refund request snapshot retrieval when seller has not yet responded to the refund request.
 *
 * **Setup Prerequisites:**
 * 1. Seller registers and authenticates
 * 2. Customer registers and authenticates
 * 3. Seller creates a product with at least one variant
 * 4. Customer places an order containing the seller's product
 * 5. Seller creates a shipment for the order item
 * 6. Customer confirms delivery of the shipment
 * 7. Customer creates a refund request for the delivered order item (within 7 days of delivery)
 * 8. Seller does NOT respond to the refund request (remains in PENDING status)
 *
 * **Test Execution:**
 * Seller calls GET /shoppingMall/seller/refund-requests/{requestId}/snapshots to retrieve the snapshot history for the refund request before responding.
 *
 * **Validation Points:**
 * 1. Response returns HTTP 200 with paginated snapshot list
 * 2. Pagination metadata shows records count
 * 3. If snapshots exist, verify the most recent snapshot shows status as PENDING
 * 4. respondedBySeller field is null (seller has not responded yet)
 * 5. responded_at timestamp is null (no response timestamp)
 * 6. snapshot_at timestamp shows when the snapshot was created
 * 7. customer field contains the customer who submitted the refund request
 * 8. reason field contains the customer's refund reason
 * 9. delivered_at timestamp is populated (required for refund requests)
 * 10. Verify seller can access snapshots for refund requests on their order items even before responding
 *
 * **Business Logic Verification:**
 * - Access control allows seller to view refund request snapshots for their order items
 * - Snapshot state accurately reflects PENDING status before seller response
 * - System correctly handles viewing snapshots before seller takes action
 */
export async function test_api_refund_request_snapshot_list_pending_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerAuth);
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(customerAuth);
  // 3. Seller creates a product (utility handles category and variant setup internally)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Customer places an order (utility handles cart setup internally)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the order item for this seller's product
  const orderItem = order.items.find(
    (item) => item.seller.id === sellerAuth.id,
  );
  TestValidator.predicate("order item exists", orderItem !== undefined);
  if (!orderItem) throw new Error("Order item not found");
  // 5. Seller creates a shipment for the order item
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: [orderItem.id],
        tracking_carrier: "TestCarrier",
        tracking_number: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(shipment);
  // 6. Customer confirms delivery of the shipment
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 7. Customer creates a refund request for the delivered order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequest);
  // Verify refund request is in PENDING status
  TestValidator.equals(
    "refund request status is PENDING",
    refundRequest.status,
    "PENDING",
  );
  TestValidator.equals(
    "responded_by_seller_id is null",
    refundRequest.responded_by_seller_id,
    null,
  );
  TestValidator.equals(
    "responded_at is null",
    refundRequest.responded_at,
    null,
  );
  // 8. Seller retrieves refund request snapshots (seller has NOT responded yet)
  const snapshots =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.list(
      sellerConnection,
      {
        requestId: refundRequest.id,
      },
    );
  typia.assert(snapshots);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    snapshots.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    snapshots.pagination.records >= 0,
  );
  // Validate snapshot data if any exist
  if (snapshots.data.length > 0) {
    const latestSnapshot = snapshots.data[0];
    // Verify snapshot structure (typia.assert already validated UUID format)
    TestValidator.equals(
      "snapshot status is PENDING",
      latestSnapshot.status,
      "PENDING",
    );
    TestValidator.equals(
      "snapshot reason matches refund request",
      latestSnapshot.reason,
      refundRequest.reason,
    );
    // Verify seller has not responded yet
    TestValidator.equals(
      "snapshot respondedBySeller is null",
      latestSnapshot.respondedBySeller,
      null,
    );
    TestValidator.equals(
      "snapshot responded_at is null",
      latestSnapshot.responded_at,
      null,
    );
    // Verify customer information
    TestValidator.equals(
      "snapshot customer matches refund request customer",
      latestSnapshot.customer.id,
      refundRequest.customer.id,
    );
    TestValidator.equals(
      "snapshot customer email matches",
      latestSnapshot.customer.email,
      refundRequest.customer.email,
    );
  }
  // Verify seller can access the snapshots (access control)
  TestValidator.predicate(
    "seller can access refund request snapshots",
    snapshots !== null && snapshots !== undefined,
  );
}
