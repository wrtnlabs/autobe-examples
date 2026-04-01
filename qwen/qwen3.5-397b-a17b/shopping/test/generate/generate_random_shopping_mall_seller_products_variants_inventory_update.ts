import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryRecord";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_inventory_record } from "../prepare/prepare_random_shopping_mall_product_inventory_record";

export async function generate_random_shopping_mall_seller_products_variants_inventory_update(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductInventoryRecord.ICreate>;
    params: {
      productId: string;
      variantId: string;
    };
  },
): Promise<IShoppingMallProductInventoryRecord> {
  const prepared: IShoppingMallProductInventoryRecord.ICreate =
    prepare_random_shopping_mall_product_inventory_record(props.body);
  const result: IShoppingMallProductInventoryRecord =
    await api.functional.shoppingMall.seller.products.variants.inventory.update(
      connection,
      {
        productId: props.params.productId,
        variantId: props.params.variantId,
        body: prepared,
      },
    );
  return result;
}
