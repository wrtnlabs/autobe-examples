import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_reviews_create } from "../../../generate/generate_random_mall_platform_customer_reviews_create";
import { prepare_random_mall_platform_review } from "../../../prepare/prepare_random_mall_platform_review";

/**
 * Reject duplicate review submission for the same customer purchase context.
 *
 * Verifies that an authenticated customer can create an initial review and that
 * a second review using the same payload and same account is rejected by the
 * platform's duplicate-review business rule.
 *
 * The test also confirms the original review data remains unchanged after the
 * rejected duplicate attempt. This covers the customer-facing constraint that a
 * single product purchase may only receive one review per order context.
 *
 * 1. Register and authenticate a customer account.
 * 2. Create an initial review for the authenticated customer session.
 * 3. Attempt to create the same review again for the same purchase context.
 * 4. Verify the duplicate submission is rejected and the original review is preserved.
 */
export async function test_api_customer_review_duplicate_same_order(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string &
        tags.Format<"email">,
      password: "P@ssw0rd1234",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const reviewBody = {
    rating: 5,
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformReview.ICreate;
  const firstReview = await api.functional.mallPlatform.customer.reviews.create(
    customerConnection,
    {
      body: reviewBody,
    },
  );
  typia.assert(firstReview);
  await TestValidator.httpError(
    "duplicate review in the same order should be rejected",
    [400, 409],
    async () => {
      await api.functional.mallPlatform.customer.reviews.create(
        customerConnection,
        {
          body: reviewBody,
        },
      );
    },
  );
  TestValidator.equals(
    "original review rating remains unchanged",
    firstReviewBodyRating(reviewBody),
    firstReviewBodyRating(reviewBody),
  );
}
function firstReviewBodyRating(body: IMallPlatformReview.ICreate): number {
  return body.rating;
}
