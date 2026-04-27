import api from "@ORGANIZATION/PROJECT-api";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_inventory_record } from "../prepare/prepare_random_ecommerce_mall_inventory_record";

/**
 * Generate a random inventory record for a product variant for E2E testing.
 *
 * Prepares random inventory record data using the prepare function, then calls
 * the creation endpoint associated with the specified product and variant. The
 * returned inventory record contains the quantity change, reason, variant
 * summary, and creation timestamp.
 *
 * @param connection  The API connection configuration
 * @param props       Generation properties including optional body overrides and
 *                    required URL parameters (productId and variantId)
 * @returns A randomly generated inventory record
 */
export async function generate_random_e_commerce_mall_seller_products_variants_inventory_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallInventoryRecord.ICreate> | undefined;
    params: {
      productId: string;
      variantId: string;
    };
  }
): Promise<IECommerceMallInventoryRecord> {
  const prepared: IECommerceMallInventoryRecord.ICreate = prepare_random_ecommerce_mall_inventory_record(
    props.body
  );
  return await api.functional.eCommerceMall.seller.products.variants.inventory.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
      variantId: props.params.variantId,
    },
  );
}