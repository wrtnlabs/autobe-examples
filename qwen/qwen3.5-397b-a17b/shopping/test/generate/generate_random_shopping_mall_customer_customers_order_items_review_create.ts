import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_review } from "../prepare/prepare_random_shopping_mall_review";

export async function generate_random_shopping_mall_customer_customers_order_items_review_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallReview.ICreate>;
    params: {
      orderItemId: string;
    };
  },
): Promise<IShoppingMallReview> {
  const prepared: IShoppingMallReview.ICreate =
    prepare_random_shopping_mall_review(props.body);
  const result: IShoppingMallReview =
    await api.functional.shoppingMall.customer.customers.order_items.review.create(
      connection,
      {
        orderItemId: props.params.orderItemId,
        body: prepared,
      },
    );
  return result;
}
