import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sale_review } from "../prepare/prepare_random_shopping_mall_sale_review";

export async function generate_random_shopping_mall_customer_sales_reviews_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSaleReview.ICreate> | undefined;
    params: {
      saleId: string;
    };
  },
): Promise<IShoppingMallSaleReview> {
  const prepared: IShoppingMallSaleReview.ICreate =
    prepare_random_shopping_mall_sale_review(props.body);
  return await api.functional.shoppingMall.customer.sales.reviews.create(
    connection,
    {
      saleId: props.params.saleId,
      body: prepared,
    },
  );
}
