import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sale_review } from "../prepare/prepare_random_shopping_mall_sale_review";

export async function generate_random_shopping_mall_customer_reviews_create_review(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSaleReview.ICreate> | undefined;
  },
): Promise<IShoppingMallSaleReview> {
  const prepared: IShoppingMallSaleReview.ICreate =
    prepare_random_shopping_mall_sale_review(props.body);
  const result: IShoppingMallSaleReview =
    await api.functional.shoppingMall.customer.reviews.createReview(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
