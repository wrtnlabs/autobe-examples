import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_review } from "../prepare/prepare_random_shopping_mall_review";

export async function generate_random_shopping_mall_customer_customers_me_reviews_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallReview.ICreate>;
  },
): Promise<IShoppingMallReview> {
  const prepared: IShoppingMallReview.ICreate =
    prepare_random_shopping_mall_review(props.body);
  const result: IShoppingMallReview =
    await api.functional.shoppingMall.customer.customers.me.reviews.create(
      connection,
      { body: prepared },
    );
  return result;
}
