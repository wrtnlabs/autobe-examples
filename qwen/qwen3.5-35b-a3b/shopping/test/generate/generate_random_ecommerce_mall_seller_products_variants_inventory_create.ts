import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_inventory_record } from "../prepare/prepare_random_ecommerce_mall_inventory_record";

export async function generate_random_ecommerce_mall_seller_products_variants_inventory_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallInventoryRecord.ICreate> | undefined;
    params: {
      productId: string;
      variantId: string;
    };
  },
): Promise<IEcommerceMallInventoryRecord> {
  const prepared: IEcommerceMallInventoryRecord.ICreate =
    prepare_random_ecommerce_mall_inventory_record(props.body);
  const result: IEcommerceMallInventoryRecord =
    await api.functional.ecommerceMall.seller.products.variants.inventory.create(
      connection,
      {
        body: prepared,
        productId: props.params.productId,
        variantId: props.params.variantId,
      },
    );
  return result;
}
