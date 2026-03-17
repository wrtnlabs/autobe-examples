import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_category } from "../prepare/prepare_random_shopping_mall_category";

export async function generate_random_shopping_mall_admin_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCategory.ICreate>;
  },
): Promise<IShoppingMallCategory> {
  const prepared: IShoppingMallCategory.ICreate =
    prepare_random_shopping_mall_category(props.body);
  const result: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: prepared,
    });
  return result;
}
