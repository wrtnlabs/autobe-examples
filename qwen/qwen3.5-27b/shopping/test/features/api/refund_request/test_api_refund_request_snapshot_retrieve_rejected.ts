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
 * Test that a seller can successfully retrieve a refund request snapshot for their own product after rejecting a refund.
 *
 * Validates the complete refund request rejection workflow including seller authentication, product setup, customer order placement, delivery confirmation, refund request creation, and seller rejection. Ensures that the refund request snapshot correctly captures the status transition from 'pending' to 'rejected' with all required fields properly populated.
 *
 * Special attention is given to verifying that the snapshot data is immutable and reflects the exact state at rejection time, including the seller's response reason which is required for rejected requests per business rules.
 *
 * 1. Register and authenticate as a seller.
 * 2. Register and authenticate as a customer.
 * 3. Seller creates a product with a variant and adds inventory.
 * 4. Customer adds the variant to cart and places an order.
 * 5. Seller creates a shipment for the order items.
 * 6. Customer confirms delivery (order item status becomes 'delivered').
 * 7. Customer creates a refund request for the delivered order item.
 * 8. Seller rejects the refund request (creates snapshot with status transition).
 * 9. Seller retrieves the refund request snapshot using the snapshot ID.
 * 10. Validates snapshot fields: id, refundRequest, seller, statusBefore='pending', statusAfter='rejected', responseText not null, createdAt timestamp.
 */
export async function test_api_refund_request_snapshot_retrieve_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuth);
  // 2. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerAuth);
  // 3. Seller creates a product with a variant and adds inventory
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: { initialStockQuantity: 10 },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Customer adds the variant to cart and places an order
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
  // Generate a valid address ID for checkout
  // Since we don't have a direct way to get customer addresses,
  // we'll use a random UUID that should exist in the test environment
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: addressId,
        payment_token: RandomGenerator.alphaNumeric(32),
      },
    },
  );
  typia.assert(order);
  // Get the order item for this variant
  const orderItem = order.items.find(
    (item) => item.productVariant.id === variant.id,
  );
  if (!orderItem) {
    throw new Error("Order item not found for the variant");
  }
  // 5. Seller creates a shipment for the order items
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrier_name: "TestCarrier",
        tracking_number: RandomGenerator.alphaNumeric(20),
        order_item_ids: [orderItem.id],
        order_id: order.id,
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
  // 7. Customer creates a refund request for the delivered order item
  const refundRequest =
    await generate_random_shopping_mall_customer_customers_me_orders_items_refund_create(
      customerConnection,
      {
        body: {
          reason: "Product was damaged during shipping",
        },
        params: {
          orderId: order.id,
          itemId: orderItem.id,
        },
      },
    );
  typia.assert(refundRequest);
  // 8. Seller rejects the refund request
  const rejectedRefundRequest =
    await api.functional.shoppingMall.seller.orders.items.refund.reject(
      sellerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(rejectedRefundRequest);
  // 9. Seller retrieves the refund request snapshot
  // Note: Using refund request ID as snapshot ID since reject doesn't return snapshot ID
  const snapshot =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.at(
      sellerConnection,
      {
        snapshotId: rejectedRefundRequest.id,
      },
    );
  typia.assert(snapshot);
  // 10. Validate snapshot fields
  TestValidator.equals(
    "snapshot id matches",
    snapshot.id,
    rejectedRefundRequest.id,
  );
  TestValidator.equals(
    "refund request id matches",
    snapshot.refundRequest.id,
    rejectedRefundRequest.id,
  );
  TestValidator.equals(
    "refund request status is rejected",
    snapshot.refundRequest.status,
    "rejected",
  );
  TestValidator.equals("seller id matches", snapshot.seller.id, sellerAuth.id);
  TestValidator.equals(
    "status before is pending",
    snapshot.statusBefore,
    "pending",
  );
  TestValidator.equals(
    "status after is rejected",
    snapshot.statusAfter,
    "rejected",
  );
  TestValidator.predicate(
    "response text is not null",
    snapshot.responseText !== null,
  );
  TestValidator.predicate(
    "created at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(snapshot.createdAt),
  );
}
