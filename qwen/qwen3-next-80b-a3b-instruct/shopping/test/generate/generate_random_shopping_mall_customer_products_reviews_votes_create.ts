import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVote";
import type { IShoppingMallReviewVoteIpLocation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVoteIpLocation";
import type { IShoppingMallReviewVotePlatformData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVotePlatformData";
import { prepare_random_shopping_mall_review_vote } from "../prepare/prepare_random_shopping_mall_review_vote";
export async function generate_random_shopping_mall_customer_products_reviews_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallReviewVote.ICreate>;
    params: {
      productId: string;
      reviewId: string;
    };
  },
): Promise<IShoppingMallReviewVote> {
  const prepared: IShoppingMallReviewVote.ICreate =
    prepare_random_shopping_mall_review_vote(props.body);
  return await api.functional.shoppingMall.customer.products.reviews.votes.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
      reviewId: props.params.reviewId,
    },
  );
}
