import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import type { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";
import { prepare_random_shopping_mall_product_review } from "../prepare/prepare_random_shopping_mall_product_review";
export async function generate_random_shopping_mall_customer_reviews_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductReview.ICreate>;
  },
): Promise<IShoppingMallProductReview> {
  const prepared: IShoppingMallProductReview.ICreate =
    prepare_random_shopping_mall_product_review(props.body);
  const result: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: prepared,
    });
  return result;
}
