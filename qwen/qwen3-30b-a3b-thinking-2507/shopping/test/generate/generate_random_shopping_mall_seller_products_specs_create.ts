import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSpec } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSpec";
import { prepare_random_shopping_mall_product_spec } from "../prepare/prepare_random_shopping_mall_product_spec";
export async function generate_random_shopping_mall_seller_products_specs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductSpec.ICreate> | undefined;
    params: {
      productCode: string;
    };
  },
): Promise<IShoppingMallProductSpec> {
  const prepared: IShoppingMallProductSpec.ICreate =
    prepare_random_shopping_mall_product_spec(props.body);
  const result: IShoppingMallProductSpec =
    await api.functional.shoppingMall.seller.products.specs.create(connection, {
      body: prepared,
      productCode: props.params.productCode,
    });
  return result;
}
