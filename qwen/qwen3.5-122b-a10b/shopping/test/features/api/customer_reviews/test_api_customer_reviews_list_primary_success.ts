import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
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
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

/**
 * Primary success path for customer viewing their own review history.
 *
 * A registered customer authenticates and retrieves their complete review history
 * across all products they have purchased and reviewed. The system returns a
 * paginated list of review summaries containing review ID, product ID, star rating
 * (1-5), optional content, creation timestamp, and deletion status flag. Reviews
 * are sorted by creation date with newest first as the default ordering.
 */
export async function test_api_customer_reviews_list_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create product and order with delivered items
  // Note: We need to create an order with delivered status to enable review creation
  // Since we don't have a direct way to set order status to delivered, we'll use
  // the order creation and assume the system handles the delivery workflow
  const order = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: RandomGenerator.name(),
        shipping_phone_number: RandomGenerator.mobile(),
        shipping_street_address: RandomGenerator.paragraph({ sentences: 2 }),
        shipping_city: RandomGenerator.name(),
        shipping_state: RandomGenerator.name(),
        shipping_postal_code: RandomGenerator.alphabets(5),
        shipping_country: RandomGenerator.name(),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 3. Create multiple reviews for delivered order items
  // Since order items need to be delivered for review creation, we'll create
  // reviews using the utility function which handles the delivery status validation
  const reviews: IEcommerceMallReview[] = [];
  // Create 2-3 reviews with varying ratings
  const reviewCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<3>
  >();
  for (let i = 0; i < reviewCount; i++) {
    const review = await generate_random_ecommerce_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          order_item_id: order.order_items[i % order.order_items.length].id,
          product_id:
            order.order_items[i % order.order_items.length].productVariant.id,
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content:
            i % 2 === 0 ? RandomGenerator.paragraph({ sentences: 3 }) : null,
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
    typia.assert(review);
    reviews.push(review);
  }
  // 4. Retrieve customer's review history with pagination
  const reviewList =
    await api.functional.ecommerceMall.customer.reviews.my.index(
      customerConnection,
      {
        body: {
          page: 1,
          pageSize: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(reviewList);
  // 5. Validate pagination metadata
  TestValidator.equals("current page", reviewList.pagination.current, 1);
  TestValidator.equals("limit per page", reviewList.pagination.limit, 20);
  TestValidator.predicate(
    "has records",
    reviewList.pagination.records >= reviewCount,
  );
  TestValidator.predicate("has pages", reviewList.pagination.pages >= 1);
  // 6. Validate review summaries
  TestValidator.equals(
    "review count matches",
    reviewList.data.length,
    reviewCount,
  );
  // Verify all reviews belong to the authenticated customer
  for (const review of reviewList.data) {
    TestValidator.equals(
      "customer ID matches",
      review.author.id,
      customerAuth.id,
    );
    TestValidator.predicate(
      "rating in range",
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.predicate("has valid timestamp", review.createdAt.length > 0);
  }
  // 7. Verify sorting order (newest first)
  if (reviewList.data.length > 1) {
    for (let i = 0; i < reviewList.data.length - 1; i++) {
      TestValidator.predicate(
        `review ${i} is newer than review ${i + 1}`,
        reviewList.data[i].createdAt >= reviewList.data[i + 1].createdAt,
      );
    }
  }
}
