import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { generate_random_shopping_mall_customer_orders_items_cancellation_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_cancellation_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test the business rule violation where a seller attempts to reject a cancellation request for an order item that has already been shipped.
 *
 * Validates that the system properly prevents sellers from rejecting cancellation requests when the order item has already been shipped. This ensures business logic integrity by blocking invalid operations on order items that have progressed beyond the 'paid' status.
 *
 * The test verifies that when a seller attempts to reject a cancellation request for a shipped item, the system returns an appropriate error and the operation is blocked.
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Customer registers and authenticates to the platform.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Customer adds the product variant to cart and completes checkout, creating an order with 'paid' status.
 * 5. Customer creates a cancellation request for the order item.
 * 6. Seller creates a shipment for the order item, changing its status to 'shipped'.
 * 7. Validates that the order item status is 'shipped'.
 * 8. Seller attempts to reject the cancellation request (should fail with error).
 * 9. Validates that the rejection attempt is blocked due to item being shipped.
 */
export async function test_api_cancellation_request_rejection_item_already_shipped(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuth);
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerAuth);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 4. Customer adds product variant to cart and completes checkout
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: product.variants[0].id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    { body: {} },
  );
  typia.assert(order);
  // Get the first order item
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // 5. Customer creates a cancellation request for the order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_orders_items_cancellation_create(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: orderItem.id,
        },
        body: {},
      },
    );
  typia.assert(cancellationRequest);
  // 6. Seller creates a shipment for the order item (changes status to 'shipped')
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: {
          orderId: order.id,
        },
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(20),
        },
      },
    );
  typia.assert(shipment);
  // 7. Validate that the order item status is now 'shipped'
  TestValidator.equals(
    "order item status is shipped after shipment creation",
    orderItem.status,
    "shipped",
  );
  // 8. Seller attempts to reject the cancellation request (should fail)
  await TestValidator.error("rejection blocked for shipped item", async () => {
    await api.functional.shoppingMall.seller.orders.items.cancellation.reject(
      sellerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          response_reason: "Cannot cancel - item has already been shipped",
        },
      },
    );
  });
}
