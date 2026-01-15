import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBrand";
import { prepare_random_shopping_mall_product_brand } from "../prepare/prepare_random_shopping_mall_product_brand";
export async function generate_random_shopping_mall_admin_brands_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductBrand.ICreate>;
  },
): Promise<IShoppingMallProductBrand> {
  const prepared: IShoppingMallProductBrand.ICreate =
    prepare_random_shopping_mall_product_brand(props.body);
  const result: IShoppingMallProductBrand =
    await api.functional.shoppingMall.admin.brands.create(connection, {
      body: prepared,
    });
  return result;
}
