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

/**
 * Test customer updating their own product review with new rating and content.
 *
 * Prerequisites:
 * 1. Seller creates product with variant
 * 2. Customer creates address, adds variant to cart
 * 3. Customer completes checkout (order created with paid status)
 * 4. Seller ships order (items change to shipped status)
 * 5. Customer confirms delivery (items change to delivered status)
 * 6. Customer creates initial review
 *
 * Test execution:
 * - Update the review with new rating (4) and content
 *
 * Validation:
 * - Response contains updated rating of 4
 * - Response contains updated content matching request
 * - Response includes reviewSnapshots array with at least one snapshot
 * - Snapshot captures previous review state
 * - updated_at is newer than created_at
 * - deleted_at is null
 */
export async function test_api_review_update_with_new_rating_and_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create approved seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Create product with variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1000>
          >(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          option_values: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  // 3. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 4. Create shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {},
    );
  // 5. Add variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  // 6. Checkout - creates order with paid status
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: `pay_${RandomGenerator.alphaNumeric(16)}`,
          address_id: address.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Get the order item for later use
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 7. Seller ships the order - changes items from paid to shipped
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItem.id],
        carrier: "DHL",
        trackingNumber: `TRK${RandomGenerator.alphaNumeric(10)}`,
      },
    },
  );
  typia.assert(shipment);
  // 8. Customer confirms delivery - changes items from shipped to delivered
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 9. Customer creates initial review with rating 3
  const initialReview =
    await generate_random_ecommerce_mall_customer_customers_orders_items_review_create(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: orderItem.id,
        },
        body: {
          rating: 3,
          content: "Initial review - product was okay",
        },
      },
    );
  typia.assert(initialReview);
  // Store original timestamps for comparison
  const originalCreatedAt = initialReview.created_at;
  const originalUpdatedAt = initialReview.updated_at;
  // 10. Update the review with new rating and content
  const updatedReview =
    await api.functional.ecommerceMall.customer.customers.reviews.update(
      customerConnection,
      {
        reviewId: initialReview.id,
        body: {
          rating: 4,
          content:
            "Updated review - product exceeded expectations in most areas",
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 11. Validate update response
  TestValidator.equals("rating updated to 4", updatedReview.rating, 4);
  TestValidator.equals(
    "content updated correctly",
    updatedReview.content,
    "Updated review - product exceeded expectations in most areas",
  );
  TestValidator.equals(
    "reviewSnapshots has at least one snapshot",
    updatedReview.reviewSnapshots.length >= 1,
    true,
  );
  TestValidator.equals(
    "snapshot captures original rating",
    updatedReview.reviewSnapshots[0].rating,
    3,
  );
  TestValidator.equals(
    "snapshot captures original content",
    updatedReview.reviewSnapshots[0].body,
    "Initial review - product was okay",
  );
  TestValidator.predicate(
    "deleted_at is null",
    updatedReview.deleted_at === null,
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedReview.updated_at) >= new Date(updatedReview.created_at),
  );
}
