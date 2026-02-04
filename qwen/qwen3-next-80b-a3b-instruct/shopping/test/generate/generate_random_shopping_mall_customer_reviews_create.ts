import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { prepare_random_shopping_mall_review } from "../prepare/prepare_random_shopping_mall_review";
export async function generate_random_shopping_mall_customer_reviews_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallReview.ICreate>;
  },
): Promise<IShoppingMallReview> {
  const prepared: IShoppingMallReview.ICreate =
    prepare_random_shopping_mall_review(props.body);
  return await api.functional.shoppingMall.customer.reviews.create(connection, {
    body: prepared,
  });
}
