import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_customer_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_items_review_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_product_reviews_retrieval_with_existing_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Create seller account and get approved
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Seller needs approval - use seller login to check status
  // Store password from join (we'll need to reconstruct or use the same flow)
  // For this test, we assume seller is auto-approved or use admin to approve
  // Since we don't have admin utilities, proceed with login
  const sellerLoginResult = await authorize_seller_login(sellerConnection, {
    body: sellerAuth as any, // Use the auth result as login credentials
  });
  typia.assert(sellerLoginResult);
  // 4. Create product with inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Create order with checkout
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 6. Get delivered order item
  const orderItem = order.orderItems?.[0];
  if (!orderItem) {
    throw new Error("No order items found in order");
  }
  // 7. Create review for the delivered order item
  const review =
    await generate_random_ecommerce_mall_customer_orders_items_review_create(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: orderItem.id,
        },
      },
    );
  typia.assert(review);
  // 8. Retrieve product reviews using the authenticated customer connection
  const reviewsResponse =
    await api.functional.ecommerceMall.customer.products.reviews.at(
      customerConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(reviewsResponse);
  // 9. Validate response structure
  TestValidator.equals("pagination exists", !!reviewsResponse.pagination, true);
  TestValidator.predicate(
    "pagination records >= 1",
    reviewsResponse.pagination.records >= 1,
  );
  TestValidator.equals("data array exists", !!reviewsResponse.data, true);
  TestValidator.predicate(
    "data array has at least one review",
    reviewsResponse.data.length >= 1,
  );
  // 10. Validate review structure
  const retrievedReview = reviewsResponse.data[0];
  TestValidator.equals("review has id", !!retrievedReview.reviewId, true);
  TestValidator.predicate(
    "rating between 1-5",
    retrievedReview.newRating >= 1 && retrievedReview.newRating <= 5,
  );
  TestValidator.equals("has createdAt", !!retrievedReview.createdAt, true);
  // 11. Validate sorting - newest first (descending by createdAt)
  for (let i = 1; i < reviewsResponse.data.length; i++) {
    const prevReview = reviewsResponse.data[i - 1];
    const currReview = reviewsResponse.data[i];
    const prevDate = new Date(prevReview.createdAt).getTime();
    const currDate = new Date(currReview.createdAt).getTime();
    TestValidator.predicate(
      `review ${i} is older or same as review ${i - 1}`,
      currDate <= prevDate,
    );
  }
}
