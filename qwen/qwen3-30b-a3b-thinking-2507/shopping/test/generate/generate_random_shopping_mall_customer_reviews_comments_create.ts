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
import type { IShoppingMallReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewComment";
import { prepare_random_shopping_mall_review_comment } from "../prepare/prepare_random_shopping_mall_review_comment";
export async function generate_random_shopping_mall_customer_reviews_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallReviewComment.ICreate> | undefined;
    params: {
      reviewCode: string;
    };
  },
): Promise<IShoppingMallReviewComment> {
  const prepared: IShoppingMallReviewComment.ICreate =
    prepare_random_shopping_mall_review_comment(props.body);
  return await api.functional.shoppingMall.customer.reviews.comments.create(
    connection,
    {
      reviewCode: props.params.reviewCode,
      body: prepared,
    },
  );
}
