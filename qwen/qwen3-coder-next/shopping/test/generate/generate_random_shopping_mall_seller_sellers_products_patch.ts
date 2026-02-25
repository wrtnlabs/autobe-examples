import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product } from "../prepare/prepare_random_shopping_mall_product";

export async function generate_random_shopping_mall_seller_sellers_products_patch(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProduct.ICreate>;
  },
): Promise<void> {
  const prepared: IShoppingMallProduct.ICreate =
    prepare_random_shopping_mall_product(props.body);
  return await api.functional.shoppingMall.seller.sellers.products.patch(
    connection,
    {
      body: prepared,
    },
  );
}
