import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewHelpfulnessVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { generate_random_ecommerce_mall_customer_reviews_helpfulness_votes_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_helpfulness_votes_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_review_helpfulness_vote } from "../../../prepare/prepare_random_ecommerce_mall_review_helpfulness_vote";

export async function test_api_review_helpfulness_vote_conflict_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Customer A (the voter)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: RandomGenerator.alphaNumeric(16) + ".example.com",
      referrer: RandomGenerator.alphaNumeric(16) + ".example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Register Customer B (the reviewer)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: RandomGenerator.alphaNumeric(16) + ".example.com",
      referrer: RandomGenerator.alphaNumeric(16) + ".example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // 3. Customer B creates a product review
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerBConnection,
    {},
  );
  typia.assert(review);
  // 4. Customer A casts their first helpfulness vote (true)
  const firstVote =
    await generate_random_ecommerce_mall_customer_reviews_helpfulness_votes_create(
      customerAConnection,
      {
        params: { reviewId: review.id },
        body: { helpfulness: true },
      },
    );
  typia.assert(firstVote);
  TestValidator.equals("first vote successful", firstVote.helpfulness, true);
  // 5. Customer A attempts to cast a second vote (false) - should fail with conflict
  await TestValidator.error("duplicate vote should fail", async () => {
    await generate_random_ecommerce_mall_customer_reviews_helpfulness_votes_create(
      customerAConnection,
      {
        params: { reviewId: review.id },
        body: { helpfulness: false },
      },
    );
  });
}
