import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventory";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_inventory } from "../prepare/prepare_random_ecommerce_inventory";

export async function generate_random_ecommerce_products_variants_inventories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceInventory.ICreate> | undefined;
    params: {
      productId: string;
      variantId: string;
    };
  },
): Promise<IEcommerceInventory> {
  const prepared: IEcommerceInventory.ICreate =
    prepare_random_ecommerce_inventory(props.body);
  const result: IEcommerceInventory =
    await api.functional.ecommerce.products.variants.inventories.create(
      connection,
      {
        productId: props.params.productId,
        variantId: props.params.variantId,
        body: prepared,
      },
    );
  return result;
}
