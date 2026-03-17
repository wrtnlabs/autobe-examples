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
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_review_helpfulness_vote_deleted_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - join and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(customer);
  // 2. Create a review for testing
  const review: IEcommerceMallReview =
    await api.functional.ecommerceMall.customer.reviews.create(
      customerConnection,
      {
        body: {
          rating: 5,
          title: RandomGenerator.name(3),
          body: RandomGenerator.paragraph({ sentences: 5 }),
          product_id: typia.random<string & tags.Format<"uuid">>(),
          order_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review);
  // 3. Soft-delete the review to simulate deleted state
  await api.functional.ecommerceMall.customer.reviews.erase(
    customerConnection,
    { reviewId: review.id },
  );
  // 4. Attempt to cast a helpfulness vote on the deleted review
  // This should return 404 Not Found since the review is deleted
  await TestValidator.error(
    "should return 404 for deleted review",
    async () => {
      await api.functional.ecommerceMall.reviews.helpfulness_votes.updateHelpfulnessVote(
        customerConnection,
        {
          reviewId: review.id,
          body: { helpfulness: true },
        },
      );
    },
  );
}
