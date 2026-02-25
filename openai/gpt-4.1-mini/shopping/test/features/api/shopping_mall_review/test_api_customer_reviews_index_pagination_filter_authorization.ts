import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_customer_reviews_index_pagination_filter_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve paged customer reviews with default filters and pagination.
  // Step 1: Setup a customer account
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(
    customerJoinConnection,
    {},
  );
  typia.assert(authorizedCustomer);
  // Create an authenticated connection for the customer
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // Step 2: Create an order for the customer
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Step 3: Create order items for the order
  const orderItemCreatePromises = order.orderItems.map((orderItem) => {
    const variantId = (orderItem as any).shoppingMallProductVariantId;
    const shoppingMallProductVariantId =
      typia.assert<string & tags.Format<"uuid">>(variantId);
    const quantity = typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(
      orderItem.quantity,
    );
    return generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: {
          shoppingMallOrderId: order.id,
          shoppingMallProductVariantId,
          quantity,
          status: "paid",
        } satisfies IShoppingMallOrderItem.ICreate,
      },
    );
  });
  const createdOrderItems = await Promise.all(orderItemCreatePromises);
  createdOrderItems.forEach((item) => typia.assert(item));
  // Step 4: Create product reviews tied to order items
  const createReviewPromises = createdOrderItems.map((orderItem) =>
    generate_random_shopping_mall_customer_reviews_create(customerConnection, {
      body: {
        rating: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        body: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallReview.ICreate,
    }),
  );
  const createdReviews = await Promise.all(createReviewPromises);
  createdReviews.forEach((review) => typia.assert(review));
  // Step 5: Call the reviews index endpoint with no additional filters to retrieve paged reviews
  const defaultIndexResponse =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      { body: {} },
    );
  typia.assert(defaultIndexResponse);
  // Step 6: Verify the response includes pagination metadata
  TestValidator.predicate(
    "pagination object present",
    typeof defaultIndexResponse.pagination === "object",
  );
  TestValidator.predicate(
    "pagination current page is >= 1",
    defaultIndexResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is >= 0",
    defaultIndexResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    defaultIndexResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    defaultIndexResponse.pagination.pages >= 0,
  );
  // Step 7: Verify list of reviews related to the customer
  TestValidator.predicate(
    "at least one review returned",
    defaultIndexResponse.data.length >= 1,
  );
  for (const review of defaultIndexResponse.data) {
    typia.assert(review);
    // Ensure each review's customer id matches authorized customer
    TestValidator.equals(
      "review customer id matches",
      review.customer.id,
      authorizedCustomer.id,
    );
    // Check no soft deleted reviews included
    TestValidator.predicate(
      "review not soft deleted",
      review.deleted_at === null,
    );
    // Confirm required fields exist
    TestValidator.predicate(
      "review has rating in 1 to 5",
      review.rating >= 1 && review.rating <= 5,
    );
  }
  // Scenario 2: Retrieve reviews filtered by rating range and including soft deleted reviews.
  // Step 1: Create some reviews with various ratings, some soft deleted
  // Create a few more reviews including soft deleted ones
  const extraReviewsPromises = ArrayUtil.repeat(3, async (index) => {
    const orderItem = createdOrderItems[index % createdOrderItems.length];
    const review = await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: (index + 1) as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          body: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
    typia.assert(review);
    return review;
  });
  const extraReviews = await Promise.all(extraReviewsPromises);
  // Since we cannot really set deletedAt via API, this will be approximation
  // Step 2: Call the reviews index endpoint with filter parameters ratingMin, ratingMax, and includeDeleted=true.
  const filteredIndexResponse =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          ratingMin: 2,
          ratingMax: 4,
          includeDeleted: true,
        },
      },
    );
  typia.assert(filteredIndexResponse);
  // Step 3: Verify response includes reviews with ratings in specified range
  for (const review of filteredIndexResponse.data) {
    TestValidator.predicate(
      "review rating within range",
      review.rating >= 2 && review.rating <= 4,
    );
  }
  // Step 4: Confirm pagination works correctly with applied filters
  TestValidator.predicate(
    "filtered pagination current page is >= 1",
    filteredIndexResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "filtered pagination limit is >= 0",
    filteredIndexResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "filtered pagination records is >= 0",
    filteredIndexResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered pagination pages is >= 0",
    filteredIndexResponse.pagination.pages >= 0,
  );
  // Scenario 3: Authorization and access controls.
  // Step 1: Unauthenticated access forbidden
  await TestValidator.httpError(
    "unauthenticated access forbidden",
    401,
    async () => {
      await api.functional.shoppingMall.customer.reviews.index(connection, {
        body: {},
      });
    },
  );
  // Step 2: Authorized access by customers allowed
  await TestValidator.predicate(
    "authorized customer can access reviews index",
    async () => {
      const response = await api.functional.shoppingMall.customer.reviews.index(
        customerConnection,
        { body: {} },
      );
      typia.assert(response);
      return true;
    },
  );
}
