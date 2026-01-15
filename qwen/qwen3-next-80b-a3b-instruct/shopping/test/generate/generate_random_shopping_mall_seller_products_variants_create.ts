import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IProductVariantAttributes } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductVariantAttributes";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { prepare_random_shopping_mall_product_variant } from "../prepare/prepare_random_shopping_mall_product_variant";
export async function generate_random_shopping_mall_seller_products_variants_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductVariant.ICreate>;
    params: {
      productId: string;
    };
  },
): Promise<IShoppingMallProductVariant> {
  const prepared: IShoppingMallProductVariant.ICreate =
    prepare_random_shopping_mall_product_variant(props.body);
  const result: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: props.params.productId,
        body: prepared,
      },
    );
  return result;
}
