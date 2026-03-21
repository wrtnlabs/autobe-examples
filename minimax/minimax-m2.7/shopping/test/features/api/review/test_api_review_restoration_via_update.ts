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
 * Test scenario for customer restoring a previously deleted review by updating it.
 *
 * **Prerequisites Setup:**
 * 1. Customer joins and authenticates
 * 2. Seller joins and authenticates
 * 3. Seller creates product with variant
 * 4. Customer creates shipping address
 * 5. Customer adds product to cart
 * 6. Customer completes checkout to create order
 * 7. Seller creates shipment for order items
 * 8. Customer confirms delivery to enable review
 * 9. Customer creates initial review
 * 10. Customer deletes the review (soft-delete)
 *
 * **Test Execution:**
 * - Call PUT /ecommerceMall/customer/customers/reviews/{reviewId} with the deleted reviewId
 * - Request body: { "rating": 5, "content": "Restored review after reconsideration" }
 *
 * **Validation Points:**
 * - Response status should be 200 OK
 * - Response should show deleted_at is now NULL (review restored)
 * - Response should contain the new rating and content
 * - Review should appear in product reviews listing again
 * - Snapshot should be created capturing the state before restoration
 */
export async function test_api_review_restoration_via_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 2. Seller joins and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerAuth.email.split("@")[0], // matches the join password
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 5. Customer creates shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postal_code: "12345",
          country: "Korea",
          is_default: true,
        },
      },
    );
  typia.assert(address);
  // 6. Customer adds product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Customer completes checkout
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token_12345",
          address_id: address.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // 8. Seller creates shipment
  const orderItemId = order.orderItems[0]?.id;
  if (!orderItemId) {
    throw new Error("No order items found in order");
  }
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItemId],
        carrier: "DHL",
        trackingNumber: "TRACK123456789",
      },
    },
  );
  typia.assert(shipment);
  // 9. Customer confirms delivery
  const shipmentId = shipment.id;
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipmentId,
      },
    );
  typia.assert(confirmedShipment);
  // 10. Customer creates initial review
  const initialReview =
    await generate_random_ecommerce_mall_customer_customers_orders_items_review_create(
      customerConnection,
      {
        params: { orderId: order.id, itemId: orderItemId },
        body: {
          rating: 4,
          content: "Initial review content",
        },
      },
    );
  typia.assert(initialReview);
  // 11. Customer deletes the review
  await api.functional.ecommerceMall.customer.customers.reviews.erase(
    customerConnection,
    {
      reviewId: initialReview.id,
    },
  );
  // 12. Customer updates the deleted review (should restore it)
  const restoredReview =
    await api.functional.ecommerceMall.customer.customers.reviews.update(
      customerConnection,
      {
        reviewId: initialReview.id,
        body: {
          rating: 5,
          content: "Restored review after reconsideration",
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(restoredReview);
  // 13. Validations
  // Review should be restored (deleted_at should be NULL)
  TestValidator.equals(
    "deleted_at should be NULL after restoration",
    restoredReview.deleted_at,
    null,
  );
  // Review should have the new rating and content
  TestValidator.equals(
    "rating should be updated to 5",
    restoredReview.rating,
    5,
  );
  TestValidator.equals(
    "content should be updated",
    restoredReview.content,
    "Restored review after reconsideration",
  );
  // Snapshot should be created (there should be at least one snapshot)
  TestValidator.predicate(
    "should have review snapshots",
    restoredReview.reviewSnapshots.length >= 1,
  );
}
