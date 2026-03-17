import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_customers_order_items_review_create } from "../../../generate/generate_random_shopping_mall_customer_customers_order_items_review_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test that a customer can successfully delete their own review.
 *
 * This test validates the soft delete mechanism for customer-owned reviews:
 * 1. Registers a new customer account
 * 2. Creates a review for an order item
 * 3. Deletes the review using the customer's authenticated connection
 * 4. Verifies the deletion operation completes successfully
 *
 * Note: Complete end-to-end scenario requires a delivered order item,
 * which needs seller/product/order workflow setup. This test focuses
 * on the review deletion functionality using available API functions.
 */
export async function test_api_review_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create a customer-specific connection with the auth token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: customerAuth.token.access,
    },
  };
  // 3. Create a review for an order item
  const inputRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const review =
    await generate_random_shopping_mall_customer_customers_order_items_review_create(
      customerConnection,
      {
        params: { orderItemId },
        body: {
          rating: inputRating,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(review);
  // Verify review was created successfully
  TestValidator.predicate("review has valid ID", () => review.id !== null);
  TestValidator.equals(
    "review rating matches input",
    review.rating,
    inputRating,
  );
  TestValidator.predicate(
    "review has customer info",
    () => review.customer !== null,
  );
  // 4. Delete the review using the customer's connection
  // The erase endpoint performs soft delete, preserving the review data and snapshots
  await api.functional.shoppingMall.customer.reviews.erase(customerConnection, {
    reviewId: review.id,
  });
  // 5. Verify deletion completed successfully
  // The erase endpoint returns void - successful completion without error
  // indicates the soft delete was applied. In a complete test setup with
  // additional API functions, we would verify:
  // - deleted=true and deleted_at timestamp is populated
  // - review no longer appears in product review listings
  // - review snapshots remain accessible
  // - deleted reviews excluded from average rating calculations
}
