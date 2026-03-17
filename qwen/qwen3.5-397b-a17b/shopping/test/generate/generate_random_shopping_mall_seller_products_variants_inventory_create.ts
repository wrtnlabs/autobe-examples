import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_inventory_record } from "../prepare/prepare_random_shopping_mall_inventory_record";

export async function generate_random_shopping_mall_seller_products_variants_inventory_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallInventoryRecord.ICreate>;
    params: {
      productId: string;
      variantId: string;
    };
  },
): Promise<IShoppingMallInventoryRecord> {
  const prepared: IShoppingMallInventoryRecord.ICreate =
    prepare_random_shopping_mall_inventory_record(props.body);
  const result: IShoppingMallInventoryRecord =
    await api.functional.shoppingMall.seller.products.variants.inventory.create(
      connection,
      {
        productId: props.params.productId,
        variantId: props.params.variantId,
        body: prepared,
      },
    );
  return result;
}
