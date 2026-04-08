import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_inventory_record } from "../prepare/prepare_random_ecommerce_mall_inventory_record";

/**
 * Generate a random inventory record for restocking or adjusting product variant stock.
 *
 * This function creates an inventory record to add or remove stock quantity for a product variant.
 * It uses the prepare function to generate valid test data and calls the seller API endpoint.
 *
 * @param connection - The API connection
 * @param props.body - Optional overrides for the inventory record data
 * @param props.params.variantId - The variant ID to add inventory to
 * @returns The created inventory record with inventory overview
 */
export async function generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallInventoryRecord.ICreate>;
    params: {
      variantId: string;
    };
  },
): Promise<IEcommerceMallInventoryRecord> {
  const prepared: IEcommerceMallInventoryRecord.ICreate =
    prepare_random_ecommerce_mall_inventory_record(props.body);
  const result: IEcommerceMallInventoryRecord =
    await api.functional.ecommerceMall.seller.productVariants.inventoryRecords.create(
      connection,
      {
        variantId: props.params.variantId,
        body: prepared,
      },
    );
  return result;
}
