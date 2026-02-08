import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_category } from "../prepare/prepare_random_shopping_mall_product_category";

export async function generate_random_shopping_mall_administrator_product_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductCategory.ICreate> | undefined;
  },
): Promise<IShoppingMallProductCategory> {
  const prepared: IShoppingMallProductCategory.ICreate =
    prepare_random_shopping_mall_product_category(props.body);
  const result: IShoppingMallProductCategory =
    await api.functional.shoppingMall.administrator.product.categories.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
