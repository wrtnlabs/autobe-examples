import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test that an authenticated customer can successfully retrieve their own active review details.
 *
 * This test verifies that:
 * 1. A customer can authenticate and create a review
 * 2. The customer can retrieve their own review by ID
 * 3. The response contains all expected fields with correct data
 * 4. The review is marked as active (deleted_at is null)
 */
export async function test_api_review_retrieve_own_active_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: undefined,
  });
  typia.assert(authorized);
  // 2. Create a review using utility function
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    { body: undefined },
  );
  typia.assert(review);
  // 3. Retrieve the review by ID
  const retrieved = await api.functional.shoppingMall.reviews.at(
    customerConnection,
    { reviewId: review.id },
  );
  typia.assert(retrieved);
  // 4. Validate business logic
  TestValidator.equals("review ID matches", retrieved.id, review.id);
  TestValidator.equals(
    "customer matches authenticated user",
    retrieved.customer.id,
    authorized.id,
  );
  TestValidator.predicate(
    "rating is between 1 and 5",
    retrieved.rating >= 1 && retrieved.rating <= 5,
  );
  TestValidator.equals(
    "review is active (not deleted)",
    retrieved.deleted_at,
    null,
  );
}
