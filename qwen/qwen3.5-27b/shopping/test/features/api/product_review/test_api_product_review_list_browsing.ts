import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_product_review_list_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 3. Create an order to get order items for review
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Extract first order item ID for review creation
  const orderItemId = order.orderItems[0].id;
  // Generate a mock product ID for review listing (since productSnapshot is JSON string)
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Create multiple reviews with different ratings
  const reviewCount = 4;
  const createdReviews: IShoppingMallReview[] = [];
  for (let i = 0; i < reviewCount; i++) {
    const review = await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          rating: (i % 5) + 1, // Ratings 1-5
          content:
            i % 2 === 0 ? RandomGenerator.paragraph({ sentences: 3 }) : null,
        } satisfies IShoppingMallReview.ICreate,
      },
    );
    typia.assert(review);
    createdReviews.push(review);
  }
  // 5. Test review listing with pagination
  const page1Response =
    await api.functional.shoppingMall.products.reviews.index(
      customerConnection,
      {
        productId: productId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(page1Response);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", page1Response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has records",
    page1Response.pagination.records > 0,
  );
  TestValidator.equals(
    "total review count matches",
    page1Response.pagination.records,
    reviewCount,
  );
  // 7. Validate review data
  TestValidator.equals(
    "reviews array length",
    page1Response.data.length,
    reviewCount,
  );
  // 8. Validate reviews are sorted by newest first
  if (page1Response.data.length >= 2) {
    TestValidator.predicate(
      "reviews sorted by created_at DESC",
      new Date(page1Response.data[0].created_at).getTime() >=
        new Date(page1Response.data[1].created_at).getTime(),
    );
  }
  // 9. Validate each review structure
  for (const review of page1Response.data) {
    TestValidator.predicate(
      `review ${review.id} has valid rating`,
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.predicate(
      `review ${review.id} has customer info`,
      review.customer.id !== undefined,
    );
    TestValidator.predicate(
      `review ${review.id} has order item info`,
      review.orderItem.id !== undefined,
    );
  }
  // 10. Test pagination with different page size
  const page2Response =
    await api.functional.shoppingMall.products.reviews.index(
      customerConnection,
      {
        productId: productId,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "pagination with limit 2 - current page",
    page2Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination with limit 2 - limit",
    page2Response.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination with limit 2 - total records",
    page2Response.pagination.records,
    reviewCount,
  );
  TestValidator.equals(
    "pagination with limit 2 - data length",
    page2Response.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination with limit 2 - has multiple pages",
    page2Response.pagination.pages > 1,
  );
  // 11. Test filtering by rating
  const fiveStarReviews =
    await api.functional.shoppingMall.products.reviews.index(
      customerConnection,
      {
        productId: productId,
        body: {
          page: 1,
          limit: 10,
          rating: 5,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(fiveStarReviews);
  for (const review of fiveStarReviews.data) {
    TestValidator.equals(
      `filtered review ${review.id} has rating 5`,
      review.rating,
      5,
    );
  }
}
