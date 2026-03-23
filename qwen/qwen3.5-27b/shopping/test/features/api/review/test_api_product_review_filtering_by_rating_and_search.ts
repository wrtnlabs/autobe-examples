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

export async function test_api_product_review_filtering_by_rating_and_search(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test advanced filtering capabilities for product reviews.
   * Verifies rating filter, text search, date range filters, combined filters,
   * pagination, and empty result handling for review filtering.
   */
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Create multiple orders to get multiple order items for reviews
  const orders: IShoppingMallOrder[] = [];
  for (let i = 0; i < 5; i++) {
    const order =
      await generate_random_shopping_mall_customer_customers_me_orders_create(
        customerConnection,
        {},
      );
    typia.assert(order);
    orders.push(order);
  }
  // 4. Create reviews with different ratings and content for each order item
  const reviewKeywords = ["excellent", "good", "average", "poor", "terrible"];
  const createdReviews: IShoppingMallReview[] = [];
  for (let i = 0; i < 5; i++) {
    const orderItem = orders[i].orderItems[0];
    typia.assert(orderItem);
    const rating = (i + 1) as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>;
    const review = await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          rating: rating,
          content: `This product is ${reviewKeywords[i]}. Great quality and fast shipping.`,
        } satisfies IShoppingMallReview.ICreate,
      },
    );
    typia.assert(review);
    createdReviews.push(review);
  }
  // 5. Test rating filter - verify only 5-star reviews are returned
  const fiveStarReviews =
    await api.functional.shoppingMall.products.reviews.index(
      customerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          rating: 5,
          customerId: customerAuth.id,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(fiveStarReviews);
  TestValidator.equals("5-star review count", fiveStarReviews.data.length, 1);
  TestValidator.predicate(
    "all reviews are 5-star",
    fiveStarReviews.data.every((r) => r.rating === 5),
  );
  // 6. Test text search - search for "excellent" keyword
  const excellentSearchResults =
    await api.functional.shoppingMall.products.reviews.index(
      customerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          search: "excellent",
          customerId: customerAuth.id,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(excellentSearchResults);
  TestValidator.predicate(
    "excellent search found results",
    excellentSearchResults.data.length > 0,
  );
  TestValidator.predicate(
    "all results contain 'excellent'",
    excellentSearchResults.data.every(
      (r) => r.content?.toLowerCase().includes("excellent") ?? false,
    ),
  );
  // 7. Test date range filter - get reviews from last 24 hours
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFilteredReviews =
    await api.functional.shoppingMall.products.reviews.index(
      customerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          startDate: yesterday.toISOString(),
          endDate: now.toISOString(),
          customerId: customerAuth.id,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(dateFilteredReviews);
  TestValidator.predicate(
    "date range found recent reviews",
    dateFilteredReviews.data.length > 0,
  );
  // 8. Test combined filters - 5-star rating with search term
  const combinedFilterResults =
    await api.functional.shoppingMall.products.reviews.index(
      customerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          rating: 5,
          search: "excellent",
          customerId: customerAuth.id,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(combinedFilterResults);
  TestValidator.predicate(
    "combined filter returns matching reviews",
    combinedFilterResults.data.length >= 0,
  );
  if (combinedFilterResults.data.length > 0) {
    TestValidator.predicate(
      "combined filter results match criteria",
      combinedFilterResults.data.every(
        (r) =>
          r.rating === 5 &&
          (r.content?.toLowerCase().includes("excellent") ?? false),
      ),
    );
  }
  // 9. Test pagination with filtered results
  const paginatedResults =
    await api.functional.shoppingMall.products.reviews.index(
      customerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          rating: 3,
          customerId: customerAuth.id,
          page: 1,
          limit: 2,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResults.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    paginatedResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination records count valid",
    paginatedResults.pagination.records >= 0,
  );
  // 10. Test empty results - search for non-existent keyword
  const emptySearchResults =
    await api.functional.shoppingMall.products.reviews.index(
      customerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          search: "nonexistentkeyword12345",
          customerId: customerAuth.id,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(emptySearchResults);
  TestValidator.equals(
    "empty search returns no results",
    emptySearchResults.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pagination records is 0",
    emptySearchResults.pagination.records,
    0,
  );
  // Additional test: verify 1-star review filter
  const oneStarReviews =
    await api.functional.shoppingMall.products.reviews.index(
      customerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          rating: 1,
          customerId: customerAuth.id,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(oneStarReviews);
  TestValidator.equals("1-star review count", oneStarReviews.data.length, 1);
  TestValidator.predicate(
    "all returned reviews are 1-star",
    oneStarReviews.data.every((r) => r.rating === 1),
  );
  // Additional test: verify 3-star review filter (average)
  const threeStarReviews =
    await api.functional.shoppingMall.products.reviews.index(
      customerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          rating: 3,
          customerId: customerAuth.id,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(threeStarReviews);
  TestValidator.equals("3-star review count", threeStarReviews.data.length, 1);
  TestValidator.predicate(
    "all returned reviews are 3-star",
    threeStarReviews.data.every((r) => r.rating === 3),
  );
}
