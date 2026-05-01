import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_variant } from "../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Generate a random shopping mall product variant via the API for E2E testing.
 *
 * Prepares random variant data using the prepare function, then calls the creation endpoint
 * to create a new variant under the specified product. The variant includes a globally unique
 * SKU code, option key-value pairs defining distinguishing attributes (e.g., color and size),
 * an optional price override, and an optional initial stock quantity.
 *
 * The caller must provide the parent product's ID via props.params.productId. The body
 * parameter accepts a DeepPartial override to customize any specific variant field before
 * creation.
 *
 * Stock is tracked through inventory records — if an initial stock quantity is provided
 * and greater than zero, an inventory record is created automatically. The returned variant
 * includes server-generated fields such as id, timestamps, base_price from the parent product,
 * and the computed stock_quantity derived from inventory records.
 */
export async function generate_random_shopping_mall_seller_products_variants_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductVariant.ICreate> | undefined;
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
