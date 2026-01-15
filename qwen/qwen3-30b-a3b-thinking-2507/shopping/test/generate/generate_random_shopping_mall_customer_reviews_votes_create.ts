import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVote";
import { prepare_random_shopping_mall_review_vote } from "../prepare/prepare_random_shopping_mall_review_vote";
export async function generate_random_shopping_mall_customer_reviews_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallReviewVote.ICreate> | undefined;
    params: {
      reviewCode: string;
    };
  },
): Promise<IShoppingMallReviewVote> {
  const prepared = prepare_random_shopping_mall_review_vote(props.body);
  return await api.functional.shoppingMall.customer.reviews.votes.create(
    connection,
    {
      reviewCode: props.params.reviewCode,
      body: prepared,
    },
  );
}
