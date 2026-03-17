import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewHelpfulnessVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_review_helpfulness_vote } from "../prepare/prepare_random_ecommerce_mall_review_helpfulness_vote";

export async function generate_random_ecommerce_mall_customer_reviews_helpfulness_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallReviewHelpfulnessVote.ICreate> | undefined;
    params: {
      reviewId: string;
    };
  },
): Promise<IEcommerceMallReviewHelpfulnessVote> {
  const prepared: IEcommerceMallReviewHelpfulnessVote.ICreate =
    prepare_random_ecommerce_mall_review_helpfulness_vote(props.body);
  return await api.functional.ecommerceMall.customer.reviews.helpfulness_votes.create(
    connection,
    {
      body: prepared,
      reviewId: props.params.reviewId,
    },
  );
}
