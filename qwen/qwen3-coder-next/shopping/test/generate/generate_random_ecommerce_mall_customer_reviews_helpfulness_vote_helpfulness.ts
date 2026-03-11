import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewHelpfulnessVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_review_helpfulness_vote } from "../prepare/prepare_random_ecommerce_mall_review_helpfulness_vote";

export async function generate_random_ecommerce_mall_customer_reviews_helpfulness_vote_helpfulness(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallReviewHelpfulnessVote.ICreate> | undefined;
    params?: {
      reviewId: string;
    };
  },
): Promise<void> {
  const prepared: IEcommerceMallReviewHelpfulnessVote.ICreate =
    prepare_random_ecommerce_mall_review_helpfulness_vote(props.body);
  await api.functional.ecommerceMall.customer.reviews.helpfulness.voteHelpfulness(
    connection,
    {
      reviewId: props.params?.reviewId ?? "",
      body: prepared,
    },
  );
  return;
}