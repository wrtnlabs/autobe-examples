import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewHelpfulnessVote";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_products_reviews_create";
import { generate_random_ecommerce_mall_customer_reviews_helpfulness_vote_helpfulness } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_helpfulness_vote_helpfulness";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_review_helpfulness_vote } from "../../../prepare/prepare_random_ecommerce_mall_review_helpfulness_vote";

export async function test_api_review_helpfulness_vote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Customer A (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_customer_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(voter);
  // 2. Create Customer B (review author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_customer_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(author);
  // 3. Author purchases product and creates a review
  // Create a product first
  const product = typia.random<IEcommerceMallProduct.ISummary>();
  typia.assert(product);
  const review =
    await generate_random_ecommerce_mall_customer_products_reviews_create(
      authorConnection,
      {
        params: { productId: product.id },
        body: {
          order_item_id: typia.random<string & tags.Format<"uuid">>(),
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          text_content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review);
  // 4. Voter casts a helpfulness vote on the review
  await generate_random_ecommerce_mall_customer_reviews_helpfulness_vote_helpfulness(
    voterConnection,
    {
      params: { reviewId: review.id },
      body: {
        review_id: review.id,
      } satisfies IEcommerceMallReviewHelpfulnessVote.ICreate,
    },
  );
}