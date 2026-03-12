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
 * Test that a customer cannot retrieve another customer's review due to authorization restrictions.
 *
 * This test verifies the privacy protection mechanism for customer reviews:
 * - Customer A creates a review
 * - Customer B attempts to access Customer A's review
 * - System returns 403 Forbidden error
 *
 * Reviews are private to their authors to protect customer privacy and prevent
 * unauthorized access to personal feedback.
 */
export async function test_api_review_retrieve_another_customer_review_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Customer A and create a review
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: "Customer A",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerAConnection,
    {},
  );
  typia.assert(review);
  // 2. Authenticate as Customer B (different customer account)
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: "Customer B",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Customer B attempts to retrieve Customer A's review
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "customer cannot access another customer's review",
    403,
    async () =>
      await api.functional.shoppingMall.reviews.at(customerBConnection, {
        reviewId: review.id,
      }),
  );
}
