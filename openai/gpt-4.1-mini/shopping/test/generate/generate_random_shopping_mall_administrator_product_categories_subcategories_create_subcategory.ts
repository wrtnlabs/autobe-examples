import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_subcategory } from "../prepare/prepare_random_shopping_mall_product_subcategory";

export async function generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductSubcategory.ICreate> | undefined;
    params: {
      categoryId: string;
    };
  },
): Promise<IShoppingMallProductSubcategory> {
  const prepared: IShoppingMallProductSubcategory.ICreate =
    prepare_random_shopping_mall_product_subcategory(props.body);
  const result: IShoppingMallProductSubcategory =
    await api.functional.shoppingMall.administrator.product.categories.subcategories.createSubcategory(
      connection,
      {
        categoryId: props.params.categoryId,
        body: prepared,
      },
    );
  return result;
}
