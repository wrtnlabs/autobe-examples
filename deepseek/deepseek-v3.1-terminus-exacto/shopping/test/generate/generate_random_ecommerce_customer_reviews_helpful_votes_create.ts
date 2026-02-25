import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_review_vote } from "../prepare/prepare_random_ecommerce_review_vote";

export async function generate_random_ecommerce_customer_reviews_helpful_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceReviewVote.ICreate> | undefined;
    params: {
      reviewId: string & tags.Format<"uuid">;
    };
  },
): Promise<IEcommerceReviewVote> {
  const prepared: IEcommerceReviewVote.ICreate =
    prepare_random_ecommerce_review_vote(props.body);
  const result: IEcommerceReviewVote =
    await api.functional.ecommerce.customer.reviews.helpful_votes.create(
      connection,
      {
        reviewId: props.params.reviewId,
        body: prepared,
      },
    );
  return result;
}
