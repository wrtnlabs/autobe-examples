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

export async function test_api_review_helpfulness_vote_unhelpful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer A who will cast the unhelpful vote
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Register customer B who will create the review
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create a product review from customer B using the generate utility
  // This utility handles order setup internally
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerBConnection,
    {
      body: {
        rating: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(review);
  // 4. Customer A casts an unhelpful vote on the review
  const vote =
    await generate_random_ecommerce_mall_customer_reviews_helpfulness_votes_create(
      customerAConnection,
      {
        body: {
          helpfulness: false satisfies boolean,
        },
        params: {
          reviewId: review.id,
        },
      },
    );
  typia.assert(vote);
  // 5. Validate the vote details
  TestValidator.equals("vote helpfulness is false", vote.helpfulness, false);
  TestValidator.equals("vote is on correct review", vote.review.id, review.id);
  // 6. Validate review's helpfulness_vote_count incremented (from vote's review info)
  TestValidator.equals(
    "review vote count is 1",
    vote.review.helpfulness_vote_count,
    1,
  );
}
