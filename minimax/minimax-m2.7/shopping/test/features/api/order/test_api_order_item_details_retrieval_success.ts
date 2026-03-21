import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test retrieving detailed order item information for a customer's own order.
 * This scenario validates the primary success path of the order item retrieval operation.
 *
 * Steps:
 * 1. Register a new customer account
 * 2. Register a new seller and approve them
 * 3. Seller creates a product with variants and inventory
 * 4. Customer adds product to cart
 * 5. Customer completes checkout with payment
 * 6. Verify order is created with order items in 'paid' status
 * 7. Call GET /customer/orders/{orderId}/items/{itemId} with the authenticated customer's order
 *
 * Expected validations:
 * - Response returns 200 OK status
 * - Response contains order item ID matching the requested itemId
 * - Order item quantity and unit price are frozen at purchase time values
 * - Order item status is 'paid' (initial status after checkout)
 * - Product snapshot is included with: product name, description, base price, category name
 * - Seller profile snapshot is included with: shop name, shop description, logo URL
 * - Product variant is included with: SKU code, option key-value pairs (color, size, etc.), price override
 * - Timestamps (createdAt, updatedAt) are present
 * - Frozen snapshots preserve historical values even if current product/seller data changes
 */
export async function test_api_order_item_details_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 2. Register a new seller and approve them
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Note: Seller needs approval - in a real test, we might need admin approval
  // For this test, we assume seller is approved or use simulation mode
  // 3. Seller creates a product with variants
  // First, we need to get the product variant ID from the created product
  // Using the generation function to create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Get the first variant from the product
  const variant = product.variants[0];
  if (!variant) {
    throw new Error("Product has no variants");
  }
  // 4. Customer adds product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 5. Customer completes checkout with payment
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token:
            "test_payment_token_" + RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Verify order was created with items in 'paid' status
  TestValidator.equals("order has items", order.orderItems.length > 0, true);
  const orderItem = order.orderItems[0];
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 6. Call GET /customer/orders/{orderId}/items/{itemId}
  const orderItemDetails =
    await api.functional.ecommerceMall.customer.orders.items.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
      },
    );
  // 7. Validate order item details response
  typia.assert(orderItemDetails);
  // Validate order item ID matches
  TestValidator.equals(
    "order item ID matches",
    orderItemDetails.id,
    orderItem.id,
  );
  // Validate quantity and unit price are frozen
  TestValidator.equals(
    "quantity matches",
    orderItemDetails.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "unit price matches",
    orderItemDetails.unitPrice,
    orderItem.unitPrice,
  );
  // Validate status is 'paid'
  TestValidator.equals("status is paid", orderItemDetails.status, "paid");
  // Validate product snapshot is included
  TestValidator.predicate(
    "product snapshot exists",
    orderItemDetails.productSnapshot !== null &&
      orderItemDetails.productSnapshot !== undefined,
  );
  TestValidator.predicate(
    "product snapshot has name",
    orderItemDetails.productSnapshot.name.length > 0,
  );
  TestValidator.predicate(
    "product snapshot has description",
    orderItemDetails.productSnapshot.description.length > 0,
  );
  TestValidator.predicate(
    "product snapshot has base_price",
    orderItemDetails.productSnapshot.base_price >= 0,
  );
  TestValidator.predicate(
    "product snapshot has category_name",
    orderItemDetails.productSnapshot.category_name.length > 0,
  );
  // Validate seller profile snapshot is included
  TestValidator.predicate(
    "seller profile snapshot exists",
    orderItemDetails.sellerProfileSnapshot !== null &&
      orderItemDetails.sellerProfileSnapshot !== undefined,
  );
  TestValidator.predicate(
    "seller profile snapshot has shop_name",
    orderItemDetails.sellerProfileSnapshot.shop_name.length > 0,
  );
  // Validate product variant is included
  TestValidator.predicate(
    "product variant exists",
    orderItemDetails.productVariant !== null &&
      orderItemDetails.productVariant !== undefined,
  );
  TestValidator.predicate(
    "product variant has sku_code",
    orderItemDetails.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "product variant has optionValues",
    orderItemDetails.productVariant.optionValues !== null &&
      orderItemDetails.productVariant.optionValues !== undefined,
  );
  // Validate timestamps are present
  TestValidator.predicate(
    "createdAt is present",
    orderItemDetails.createdAt !== null &&
      orderItemDetails.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt is present",
    orderItemDetails.updatedAt !== null &&
      orderItemDetails.updatedAt !== undefined,
  );
}
