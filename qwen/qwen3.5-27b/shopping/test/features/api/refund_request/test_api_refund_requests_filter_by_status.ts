import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_customer_orders_items_refund_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_refund_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a seller can filter refund requests by status (pending, approved, rejected).
 *
 * Validates the complete refund request filtering workflow including seller and customer authentication, product creation, order placement, shipment, delivery confirmation, and refund request management. Ensures that the status filter correctly returns only refund requests matching the specified status.
 *
 * Special attention is given to verifying that each status filter returns the correct subset of refund requests, that approved/rejected requests include the responded_at timestamp, and that the seller field is populated for responded requests.
 *
 * 1. Seller registers and authenticates.
 * 2. Seller creates two products with variants.
 * 3. Customer registers and authenticates.
 * 4. Customer places an order containing both product variants.
 * 5. Seller creates a shipment for all order items.
 * 6. Customer confirms delivery for the shipment.
 * 7. Customer creates three refund requests for different order items.
 * 8. Seller approves the first refund request.
 * 9. Seller rejects the second refund request.
 * 10. Seller filters refund requests by status 'pending' and verifies only one request is returned.
 * 11. Seller filters refund requests by status 'approved' and verifies only one request is returned.
 * 12. Seller filters refund requests by status 'rejected' and verifies only one request is returned.
 */
export async function test_api_refund_requests_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create two products with variants
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product1);
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          sku_code: "VAR1-001",
          variantOptions: [{ key: "color", value: "Red" }],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant1);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product2);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {
          sku_code: "VAR2-001",
          variantOptions: [{ key: "color", value: "Blue" }],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant2);
  // 3. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 4. Customer places order (using utility that handles cart + checkout)
  // Note: The checkout utility will create an order with items from available products
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Extract order items for shipment and refund requests
  const orderItems = order.items;
  TestValidator.predicate("order has at least 2 items", orderItems.length >= 2);
  // 5. Seller creates shipment for order items
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrier_name: "TestCarrier",
        tracking_number: "TRACK123456",
        order_item_ids: orderItems.map((item) => item.id),
      },
    },
  );
  typia.assert(shipment);
  // 6. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 7. Customer creates three refund requests for different order items
  // First refund request
  const refundRequest1 =
    await generate_random_shopping_mall_customer_orders_items_refund_create(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: orderItems[0].id,
        },
        body: {
          reason: "Product arrived damaged",
        },
      },
    );
  typia.assert(refundRequest1);
  // Second refund request
  const refundRequest2 =
    await generate_random_shopping_mall_customer_orders_items_refund_create(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: orderItems[1].id,
        },
        body: {
          reason: "Wrong item received",
        },
      },
    );
  typia.assert(refundRequest2);
  // Third refund request (for a third item if available, otherwise reuse first item)
  const refundRequest3 =
    await generate_random_shopping_mall_customer_orders_items_refund_create(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: orderItems.length > 2 ? orderItems[2].id : orderItems[0].id,
        },
        body: {
          reason: "Changed my mind",
        },
      },
    );
  typia.assert(refundRequest3);
  // 8. Seller approves first refund request
  const approvedRefund =
    await api.functional.shoppingMall.seller.orders.items.refund.approve(
      sellerConnection,
      {
        orderId: order.id,
        itemId: orderItems[0].id,
        body: {
          responseText: "We apologize for the inconvenience. Refund approved.",
        },
      },
    );
  typia.assert(approvedRefund);
  // 9. Seller rejects second refund request
  const rejectedRefund =
    await api.functional.shoppingMall.seller.orders.items.refund.reject(
      sellerConnection,
      {
        orderId: order.id,
        itemId: orderItems[1].id,
      },
    );
  typia.assert(rejectedRefund);
  // 10. Filter by status 'pending'
  const pendingResult =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(pendingResult);
  TestValidator.equals(
    "pending filter returns correct count",
    pendingResult.data.length,
    1,
  );
  TestValidator.equals(
    "pending request has correct status",
    pendingResult.data[0].status,
    "pending",
  );
  TestValidator.predicate(
    "pending request has null responded_at",
    pendingResult.data[0].responded_at === null,
  );
  TestValidator.predicate(
    "pending request has null seller",
    pendingResult.data[0].seller === null,
  );
  // 11. Filter by status 'approved'
  const approvedResult =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(approvedResult);
  TestValidator.equals(
    "approved filter returns correct count",
    approvedResult.data.length,
    1,
  );
  TestValidator.equals(
    "approved request has correct status",
    approvedResult.data[0].status,
    "approved",
  );
  TestValidator.predicate(
    "approved request has responded_at timestamp",
    approvedResult.data[0].responded_at !== null,
  );
  TestValidator.predicate(
    "approved request has seller populated",
    approvedResult.data[0].seller !== null,
  );
  // 12. Filter by status 'rejected'
  const rejectedResult =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
        },
      },
    );
  typia.assert(rejectedResult);
  TestValidator.equals(
    "rejected filter returns correct count",
    rejectedResult.data.length,
    1,
  );
  TestValidator.equals(
    "rejected request has correct status",
    rejectedResult.data[0].status,
    "rejected",
  );
  TestValidator.predicate(
    "rejected request has responded_at timestamp",
    rejectedResult.data[0].responded_at !== null,
  );
  TestValidator.predicate(
    "rejected request has seller populated",
    rejectedResult.data[0].seller !== null,
  );
}
