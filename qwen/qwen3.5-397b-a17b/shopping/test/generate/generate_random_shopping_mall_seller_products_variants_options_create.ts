import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_variant_option } from "../prepare/prepare_random_shopping_mall_product_variant_option";

export async function generate_random_shopping_mall_seller_products_variants_options_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductVariantOption.ICreate>;
    params: {
      productId: string;
      variantId: string;
    };
  },
): Promise<IShoppingMallProductVariantOption> {
  const prepared: IShoppingMallProductVariantOption.ICreate =
    prepare_random_shopping_mall_product_variant_option(props.body);
  const result: IShoppingMallProductVariantOption =
    await api.functional.shoppingMall.seller.products.variants.options.create(
      connection,
      {
        productId: props.params.productId,
        variantId: props.params.variantId,
        body: prepared,
      },
    );
  return result;
}
