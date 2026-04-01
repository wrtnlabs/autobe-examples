import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_option_definition } from "../prepare/prepare_random_shopping_mall_product_option_definition";

export async function generate_random_shopping_mall_seller_products_option_definitions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductOptionDefinition.ICreate>;
    params: {
      productId: string;
    };
  },
): Promise<IShoppingMallProductOptionDefinition> {
  const prepared: IShoppingMallProductOptionDefinition.ICreate =
    prepare_random_shopping_mall_product_option_definition(props.body);
  const result: IShoppingMallProductOptionDefinition =
    await api.functional.shoppingMall.seller.products.option_definitions.create(
      connection,
      {
        productId: props.params.productId,
        body: prepared,
      },
    );
  return result;
}
