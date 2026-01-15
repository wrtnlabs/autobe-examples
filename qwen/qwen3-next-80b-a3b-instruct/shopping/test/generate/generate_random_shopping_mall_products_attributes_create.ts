import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import { prepare_random_shopping_mall_product_attribute } from "../prepare/prepare_random_shopping_mall_product_attribute";
export async function generate_random_shopping_mall_products_attributes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductAttribute.ICreate>;
    params: {
      productId: string;
    };
  },
): Promise<IShoppingMallProductAttribute> {
  const prepared: IShoppingMallProductAttribute.ICreate =
    prepare_random_shopping_mall_product_attribute(props.body);
  return await api.functional.shoppingMall.products.attributes.create(
    connection,
    {
      productId: props.params.productId,
      body: prepared,
    },
  );
}
