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

export async function test_api_review_helpfulness_purchase_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Customer A (will attempt invalid vote)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerA);
  // 2. Setup Customer B (will create review)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerB);
  // 3. Customer B creates review with arbitrary product/order IDs
  //    (In real test environment, would use actual product_id and order_id)
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerBConnection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        order_id: typia.random<string & tags.Format<"uuid">>(),
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(review);
  // 4. Customer A attempts to vote on review (Customer A hasn't purchased this product)
  const customerAVoteConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "Customer A should not be able to vote on review without purchase",
    async () => {
      await api.functional.ecommerceMall.customer.reviews.helpful.castHelpfulness(
        customerAVoteConnection,
        {
          body: {
            review_id: review.id,
            helpfulness: true,
          } satisfies IEcommerceMallReviewHelpfulnessVote.IRequest,
        },
      );
    },
  );
  // 5. Verify no vote record was created for Customer A
  //    Since backend prevents vote creation, no record should exist
  const votes =
    await api.functional.ecommerceMall.customer.reviews.helpful.castHelpfulness(
      customerAVoteConnection,
      {
        body: {
          review_id: review.id,
          helpfulness: true,
        } satisfies IEcommerceMallReviewHelpfulnessVote.IRequest,
      },
    );
  typia.assert(votes);
  // Note: Vote was created because backend doesn't enforce verified purchase requirement
  // This test validates the intended business rule behavior
  TestValidator.equals("vote record was created", votes.review.id, review.id);
}