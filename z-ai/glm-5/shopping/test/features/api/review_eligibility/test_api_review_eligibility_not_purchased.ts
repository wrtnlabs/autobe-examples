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

/**
 * Test that a customer who has never purchased a product is not eligible to write a review.
 * This enforces the verified purchase requirement.
 *
 * Prerequisites: Only customer authentication is needed. No product purchase or delivery
 * should exist for this customer-product combination.
 *
 * Test Steps:
 * 1. Register and authenticate a new customer
 * 2. Generate a random product ID (representing a product the customer has never purchased)
 * 3. Call GET /shoppingMall/customer/products/{productId}/review-eligibility
 * 4. Verify response: isEligible = false, reason = 'NOT_PURCHASED'
 */
export async function test_api_review_eligibility_not_purchased(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://test.com/join",
      referrer: "https://test.com",
    },
  });
  // 2. Generate a random product ID that the customer has never purchased
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 3. Check review eligibility for this product
  const eligibility =
    await api.functional.shoppingMall.customer.products.review_eligibility.checkReviewEligibility(
      customerConnection,
      { productId },
    );
  typia.assert(eligibility);
  // 4. Validate the response - customer has never purchased this product
  TestValidator.equals(
    "isEligible should be false",
    eligibility.isEligible,
    false,
  );
  TestValidator.equals(
    "reason should be NOT_PURCHASED",
    eligibility.reason,
    "NOT_PURCHASED",
  );
  TestValidator.equals(
    "eligibleOrderIds should be empty",
    eligibility.eligibleOrderIds.length,
    0,
  );
  TestValidator.equals(
    "totalDeliveredItems should be 0",
    eligibility.totalDeliveredItems,
    0,
  );
  TestValidator.equals(
    "reviewedCount should be 0",
    eligibility.reviewedCount,
    0,
  );
}
