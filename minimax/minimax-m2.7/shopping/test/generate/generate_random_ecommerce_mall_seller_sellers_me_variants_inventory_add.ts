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
 * Generate a random inventory record via the API for E2E testing.
 *
 * Creates an inventory record for a product variant by either restocking (positive quantity)
 * or adjusting (negative quantity) the stock. The function requires a valid variantId
 * that belongs to the authenticated seller.
 *
 * The prepared data includes a random non-zero quantity change (positive or negative)
 * and a descriptive reason explaining the business context of the inventory change.
 *
 * @param connection - API connection for authenticated seller session
 * @param props.body - Optional overrides for quantityChange and reason fields
 * @param props.params.variantId - UUID of the product variant to update inventory for
 * @returns The created inventory record with ID, quantity change, reason, and timestamp
 */
export async function generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
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
    await api.functional.ecommerceMall.seller.sellers.me.variants._inventory.add(
      connection,
      {
        variantId: props.params.variantId,
        body: prepared,
      },
    );
  return result;
}
