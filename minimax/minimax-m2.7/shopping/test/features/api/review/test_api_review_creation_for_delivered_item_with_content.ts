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
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
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
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_orders_items_review_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_review_creation_for_delivered_item_with_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer for review author
  const customerAuth: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAuth, {});
  // 2. Register seller to create products for purchase
  const sellerAuth: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAuth, {});
  // 3. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAuth,
    {
      body: {},
    },
  );
  typia.assert(product);
  // 4. Seller creates variant with stock (quantity > 0 for checkout to succeed)
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerAuth,
      {
        params: { productId: product.id },
        body: { quantity: 10 },
      },
    );
  typia.assert(variant);
  // 5. Customer creates shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerAuth,
      {
        body: {},
      },
    );
  typia.assert(address);
  // 6. Customer adds item to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerAuth,
      {
        body: { variant_id: variant.id, quantity: 1 },
      },
    );
  typia.assert(cartItem);
  // 7. Customer confirms checkout with payment token and address
  const checkoutResult =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerAuth,
      {
        body: {
          payment_token: "test_payment_token_12345",
          address_id: address.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(checkoutResult);
  // 8. Extract order and item IDs
  const orderId = checkoutResult.id;
  const orderItem = checkoutResult.orderItems[0];
  const itemId = orderItem.id;
  // Verify order is in 'paid' status
  TestValidator.equals("order status is paid", checkoutResult.status, "paid");
  // 9. Seller creates shipment for the order
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerAuth,
    {
      body: {
        orderId: orderId,
        orderItemIds: [itemId],
        carrier: "FastShip",
        trackingNumber: "TRACK123456789",
      },
    },
  );
  typia.assert(shipment);
  // 10. Customer confirms delivery
  const deliveryConfirmed =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerAuth,
      {
        orderId: orderId,
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveryConfirmed);
  // 11. Verify order item status changed to 'delivered'
  TestValidator.equals(
    "shipment has items",
    shipment.shipment_items.length > 0,
    true,
  );
  const deliveredItemStatus = shipment.shipment_items[0].orderItem.status;
  TestValidator.equals(
    "order item status is delivered",
    deliveredItemStatus,
    "delivered",
  );
  // 12. Customer creates review with rating=5 and content='Excellent product!'
  const review =
    await api.functional.ecommerceMall.customer.customers.orders.items.review.create(
      customerAuth,
      {
        orderId: orderId,
        itemId: itemId,
        body: {
          rating: 5,
          content: "Excellent product!",
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review);
  // Verify review business logic values
  TestValidator.equals("review rating is 5", review.rating, 5);
  TestValidator.equals(
    "review content matches",
    review.content,
    "Excellent product!",
  );
}
