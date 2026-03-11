import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test that a customer cannot update another customer's review.
 *
 * This test validates the ownership verification system that prevents
 * unauthorized modifications to reviews. The system must enforce that
 * only the original author can modify their own review.
 *
 * Steps:
 * 1. Create Customer A and authenticate
 * 2. Customer A creates a review
 * 3. Create Customer B and authenticate (different customer)
 * 4. Customer B attempts to update Customer A's review
 * 5. Verify 403 Forbidden is returned
 */
export async function test_api_review_update_forbidden_non_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate Customer A (review author)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://test.com/reviews",
      referrer: "https://test.com",
    },
  });
  typia.assert(customerA);
  // Step 2: Customer A creates a review
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerAConnection,
    {
      body: {
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(review);
  // Step 3: Create and authenticate Customer B (different customer)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://test.com/reviews",
      referrer: "https://test.com",
    },
  });
  typia.assert(customerB);
  // Step 4: Customer B attempts to update Customer A's review
  // This should fail with 403 Forbidden
  await TestValidator.error(
    "Customer B cannot update Customer A's review",
    async () => {
      await api.functional.shoppingMall.customer.reviews.update(
        customerBConnection,
        {
          reviewId: review.id,
          body: {
            rating: 5,
            content: "Unauthorized modification attempt",
          },
        },
      );
    },
  );
}
