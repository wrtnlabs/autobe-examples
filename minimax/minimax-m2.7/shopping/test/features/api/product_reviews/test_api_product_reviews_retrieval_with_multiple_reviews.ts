import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
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

export async function test_api_product_reviews_retrieval_with_multiple_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 3. Create product with seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Create multiple product variants (5 colors for 5 reviews)
  const colors = ["red", "blue", "green", "yellow", "black"];
  const variants: IEcommerceMallProductVariant[] = [];
  for (const color of colors) {
    const variant =
      await generate_random_ecommerce_mall_seller_seller_products_variants_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            sku_code: `SKU-${color.toUpperCase()}-${Date.now()}`,
            price: 10000 + variants.length * 1000,
            quantity: 5,
            option_values: [{ key: "color", value: color }],
          },
        },
      );
    typia.assert(variant);
    variants.push(variant);
  }
  // 5. Add each variant to cart
  for (const variant of variants) {
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
  }
  // 6. Prepare checkout
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerConnection,
    );
  typia.assert(checkoutPrepare);
  // 7. Confirm checkout (creates order with multiple items)
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: `pay_token_${Date.now()}`,
        },
      },
    );
  typia.assert(order);
  // 8. Seller creates shipment for all order items
  const orderItemIds = order.orderItems.map(
    (item: IEcommerceMallOrderItem) => item.id,
  );
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: orderItemIds,
        carrier: "DHL",
        trackingNumber: `TRACK${Date.now()}`,
      },
    },
  );
  typia.assert(shipment);
  // 9. Customer confirms delivery
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 10. Create multiple reviews with varying ratings (one per order item)
  const reviewRatings = [5, 4, 3, 2, 1] as const;
  const createdReviews: IEcommerceMallReview[] = [];
  for (let i = 0; i < order.orderItems.length; i++) {
    const orderItem = order.orderItems[i];
    const rating = reviewRatings[i];
    const review =
      await generate_random_ecommerce_mall_customer_customers_orders_items_review_create(
        customerConnection,
        {
          params: {
            orderId: order.id,
            itemId: orderItem.id,
          },
          body: {
            rating: rating,
            content: `Review with ${rating} stars for ${colors[i]} variant`,
          },
        },
      );
    typia.assert(review);
    createdReviews.push(review);
  }
  // 11. Retrieve product reviews
  const reviewsResponse =
    await api.functional.ecommerceMall.products.reviews.list(
      customerConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(reviewsResponse);
  // 12. Validate response structure and content
  TestValidator.equals(
    "returned reviews count matches created",
    reviewsResponse.data.length,
    reviewRatings.length,
  );
  // Validate pagination metadata exists
  TestValidator.predicate(
    "pagination has current",
    reviewsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    reviewsResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    reviewsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    reviewsResponse.pagination.pages >= 0,
  );
  // Validate reviews are sorted by created_at descending (newest first)
  for (let i = 0; i < reviewsResponse.data.length - 1; i++) {
    const current = new Date(reviewsResponse.data[i].created_at).getTime();
    const next = new Date(reviewsResponse.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `review ${i} is newer than review ${i + 1}`,
      current >= next,
    );
  }
  // Validate each review has required fields
  for (const review of reviewsResponse.data) {
    TestValidator.predicate(
      "rating is between 1 and 5",
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.equals("review has id", review.id !== undefined, true);
    TestValidator.equals(
      "review has created_at",
      review.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "review has customer",
      review.customer !== undefined,
      true,
    );
    TestValidator.equals(
      "review has product",
      review.product !== undefined,
      true,
    );
  }
  // Validate customer summary structure
  const firstReview = reviewsResponse.data[0];
  TestValidator.equals(
    "customer has id",
    firstReview.customer.id !== undefined,
    true,
  );
  TestValidator.equals(
    "customer has email",
    firstReview.customer.email !== undefined,
    true,
  );
  // Validate product summary structure
  TestValidator.equals(
    "product has id",
    firstReview.product.id !== undefined,
    true,
  );
  TestValidator.equals(
    "product has name",
    firstReview.product.name !== undefined,
    true,
  );
  TestValidator.equals(
    "product has min_price",
    firstReview.product.min_price !== undefined,
    true,
  );
  TestValidator.equals(
    "product has max_price",
    firstReview.product.max_price !== undefined,
    true,
  );
  TestValidator.equals(
    "product has primary_image_url",
    firstReview.product.primary_image_url !== undefined,
    true,
  );
  TestValidator.equals(
    "product has seller_name",
    firstReview.product.seller_name !== undefined,
    true,
  );
  TestValidator.equals(
    "product has average_rating",
    firstReview.product.average_rating !== undefined,
    true,
  );
  TestValidator.equals(
    "product has reviews_count",
    firstReview.product.reviews_count !== undefined,
    true,
  );
  TestValidator.equals(
    "product has created_at",
    firstReview.product.created_at !== undefined,
    true,
  );
}
