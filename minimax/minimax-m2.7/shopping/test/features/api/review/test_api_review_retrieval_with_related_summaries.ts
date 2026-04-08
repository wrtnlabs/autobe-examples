import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallPaymentWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPaymentWebhook";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_customer_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_items_review_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_review_retrieval_with_related_summaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a customer who will write the review
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 2. Register and approve a seller, then create a product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  // 3. Customer adds product to cart
  const cart =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: product.variants[0].id,
          quantity: 1,
        },
      },
    );
  // 4. Customer completes checkout
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {
        body: {},
      },
    );
  // 5. Simulate payment webhook
  await api.functional.ecommerceMall.payments.webhook.receive(connection, {
    body: {
      transactionId: typia.random<string & tags.Format<"uuid">>(),
      orderReference: order.orderNumber,
      status: "captured" as const,
      amount: order.totalAmount,
      currency: "USD",
      timestamp: new Date().toISOString(),
    },
  });
  // 6. Seller creates shipment to change order item status to "delivered"
  const orderItemId = order.orderItems[0].id;
  await generate_random_ecommerce_mall_seller_orders_shipments_create(
    sellerConnection,
    {
      params: { orderId: order.id },
      body: {
        orderItemIds: [orderItemId],
        carrier: "TestCarrier",
        trackingNumber: "TRACK123456",
      },
    },
  );
  // 7. Customer creates a review for the delivered order item
  const reviewContent = RandomGenerator.paragraph({ sentences: 2 });
  const reviewRating = 5;
  const review =
    await generate_random_ecommerce_mall_customer_orders_items_review_create(
      customerConnection,
      {
        params: { orderId: order.id, itemId: orderItemId },
        body: {
          content: reviewContent,
          rating: reviewRating,
        },
      },
    );
  // 8. Retrieve the review using GET /ecommerceMall/reviews/{reviewId}
  const retrievedReview = await api.functional.ecommerceMall.reviews.at(
    customerConnection,
    { reviewId: review.id },
  );
  // Validate response with typia
  typia.assert(retrievedReview);
  // TestValidator.assertions
  TestValidator.equals("review id matches", retrievedReview.id, review.id);
  TestValidator.predicate(
    "rating between 1-5",
    retrievedReview.rating >= 1 && retrievedReview.rating <= 5,
  );
  TestValidator.equals(
    "content matches",
    retrievedReview.content,
    reviewContent,
  );
  TestValidator.predicate(
    "createdAt present",
    retrievedReview.createdAt !== undefined &&
      retrievedReview.createdAt !== null,
  );
  TestValidator.predicate(
    "updatedAt present",
    retrievedReview.updatedAt !== undefined &&
      retrievedReview.updatedAt !== null,
  );
  TestValidator.predicate(
    "customer summary present",
    retrievedReview.customer !== undefined && retrievedReview.customer !== null,
  );
  TestValidator.equals(
    "customer id matches",
    retrievedReview.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedReview.customer.email,
    customerAuth.email,
  );
  TestValidator.predicate(
    "product summary present",
    retrievedReview.product !== undefined && retrievedReview.product !== null,
  );
  TestValidator.equals(
    "product id matches",
    retrievedReview.product.id,
    product.id,
  );
  TestValidator.equals(
    "product name matches",
    retrievedReview.product.name,
    product.name,
  );
  TestValidator.predicate(
    "orderItem summary present",
    retrievedReview.orderItem !== undefined &&
      retrievedReview.orderItem !== null,
  );
  TestValidator.equals(
    "orderItem id matches",
    retrievedReview.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "orderItem status is delivered",
    retrievedReview.orderItem.status,
    "delivered",
  );
  TestValidator.predicate(
    "reviewSnapshots array present",
    Array.isArray(retrievedReview.reviewSnapshots),
  );
  TestValidator.equals("deletedAt is null", retrievedReview.deletedAt, null);
}
