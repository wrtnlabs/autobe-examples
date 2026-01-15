import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";
import { prepare_random_shopping_mall_review_flag } from "../prepare/prepare_random_shopping_mall_review_flag";
export async function generate_random_shopping_mall_customer_reviews_flags_patch_by_reviewid(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallReviewFlag.ICreate> | undefined;
    params: {
      reviewId: string;
    };
  },
): Promise<IShoppingMallReviewFlag> {
  const prepared: IShoppingMallReviewFlag.ICreate =
    prepare_random_shopping_mall_review_flag(props.body);
  return await api.functional.shoppingMall.customer.reviews.flags.patchByReviewid(
    connection,
    {
      body: prepared,
      reviewId: props.params.reviewId,
    },
  );
}
