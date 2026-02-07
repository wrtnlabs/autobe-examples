import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_subcategory } from "../prepare/prepare_random_shopping_mall_subcategory";

export async function generate_random_shopping_mall_admin_categories_subcategories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSubcategory.ICreate> | undefined;
    params: {
      categoryId: string;
    };
  },
): Promise<IShoppingMallSubcategory> {
  const prepared: IShoppingMallSubcategory.ICreate =
    prepare_random_shopping_mall_subcategory(props.body);
  return await api.functional.shoppingMall.admin.categories.subcategories.create(
    connection,
    {
      body: prepared,
      categoryId: props.params.categoryId,
    },
  );
}
