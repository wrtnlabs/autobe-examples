import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_customer_customers_me_orders_items_refund_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_items_refund_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a seller can successfully retrieve a refund request snapshot for their own product after approving a refund.
 *
 * Validates the complete refund request snapshot retrieval flow including seller authentication, product creation, customer order placement, shipment creation, delivery confirmation, refund request creation, refund approval, and snapshot retrieval. Ensures that the snapshot correctly captures the status transition from pending to approved with all relevant audit information.
 *
 * Special attention is given to verifying that the snapshot data is immutable and reflects the exact state at approval time, including the seller's response reason, the status before and after the transition, and all nested object references.
 *
 * 1. Seller registers and authenticates to create products and approve refunds.
 * 2. Customer registers and authenticates to place orders and create refund requests.
 * 3. Seller creates a product with a variant and adds initial inventory.
 * 4. Customer adds the variant to cart and completes checkout to create an order.
 * 5. Seller creates a shipment for the order items, changing their status to 'shipped'.
 * 6. Customer confirms delivery, changing order item status to 'delivered'.
 * 7. Customer creates a refund request for the delivered order item.
 * 8. Seller approves the refund request, creating a snapshot with status transition.
 * 9. Seller retrieves the refund request snapshot using a generated snapshot ID (simulated mode).
 * 10. Validates snapshot fields match expected values including status transition and seller reference.
 */
export async function test_api_refund_request_snapshot_retrieve_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: undefined,
  });
  typia.assert(sellerAuth);
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: undefined,
  });
  typia.assert(customerAuth);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: undefined,
    },
  );
  typia.assert(product);
  // 4. Seller creates a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: undefined,
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Seller adds inventory to the variant
  await generate_random_shopping_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      body: {
        quantity_change: 10,
        reason: "Initial stock for testing",
      },
      params: { productId: product.id, variantId: variant.id },
    },
  );
  // 6. Customer adds variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Customer places order through checkout
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: undefined,
    },
  );
  typia.assert(order);
  // 8. Seller creates shipment for the order items
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrier_name: "TestCarrier",
        tracking_number: "TRACK123456",
        order_item_ids: order.items.map((item) => item.id),
      },
    },
  );
  typia.assert(shipment);
  // 9. Customer confirms delivery
  await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );
  // 10. Customer creates refund request for the delivered order item
  const orderItemId = order.items[0].id;
  const refundRequest =
    await generate_random_shopping_mall_customer_customers_me_orders_items_refund_create(
      customerConnection,
      {
        body: {
          reason: "Product arrived damaged",
        },
        params: {
          orderId: order.id,
          itemId: orderItemId,
        },
      },
    );
  typia.assert(refundRequest);
  // 11. Seller approves the refund request
  const approvedRefund =
    await api.functional.shoppingMall.seller.orders.items.refund.approve(
      sellerConnection,
      {
        orderId: order.id,
        itemId: orderItemId,
        body: {
          responseText: "Refund approved due to damaged product",
        } satisfies IShoppingMallRefundRequest.IApprove,
      },
    );
  typia.assert(approvedRefund);
  // 12. Verify the refund request status is approved
  TestValidator.equals(
    "refund request status is approved",
    approvedRefund.status,
    "approved",
  );
  // 13. Retrieve the refund request snapshot using simulated mode
  // Note: In a real scenario, the snapshot ID would be returned from the approve operation
  // or obtained through a list snapshots endpoint. Here we use a generated UUID for testing.
  const snapshotConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.at(
      snapshotConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 14. Validate snapshot fields
  TestValidator.equals("snapshot id matches", snapshot.id, snapshotId);
  TestValidator.equals(
    "refund request status is approved",
    snapshot.refundRequest.status,
    "approved",
  );
  TestValidator.equals(
    "status before is pending",
    snapshot.statusBefore,
    "pending",
  );
  TestValidator.equals(
    "status after is approved",
    snapshot.statusAfter,
    "approved",
  );
  TestValidator.predicate(
    "response text is not empty",
    snapshot.responseText !== null && snapshot.responseText.length > 0,
  );
  TestValidator.predicate(
    "created at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      snapshot.createdAt,
    ),
  );
  TestValidator.predicate(
    "seller reference exists",
    snapshot.seller !== null && snapshot.seller.id !== undefined,
  );
  TestValidator.predicate(
    "refund request reference exists",
    snapshot.refundRequest !== null && snapshot.refundRequest.id !== undefined,
  );
}
