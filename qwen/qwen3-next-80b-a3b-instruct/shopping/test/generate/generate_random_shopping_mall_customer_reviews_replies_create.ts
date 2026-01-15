import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";
import { prepare_random_shopping_mall_review_reply } from "../prepare/prepare_random_shopping_mall_review_reply";
export async function generate_random_shopping_mall_customer_reviews_replies_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallReviewReply.ICreate> | undefined;
    params: {
      reviewId: string;
    };
  },
): Promise<IShoppingMallReviewReply> {
  const prepared: IShoppingMallReviewReply.ICreate =
    prepare_random_shopping_mall_review_reply(props.body);
  return await api.functional.shoppingMall.customer.reviews.replies.create(
    connection,
    {
      body: prepared,
      reviewId: props.params.reviewId,
    },
  );
}
