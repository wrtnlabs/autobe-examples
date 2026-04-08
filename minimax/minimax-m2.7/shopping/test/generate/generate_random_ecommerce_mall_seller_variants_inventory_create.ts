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
 * Generate a random inventory record for a product variant via the API for E2E testing.
 *
 * Creates an inventory record to add or adjust stock for a product variant owned by the authenticated seller.
 * Positive quantityChange values increase stock (restocking), while negative values decrease stock (adjustments).
 * Each inventory change is recorded with a reason for audit purposes.
 *
 * The variantId must reference an existing product variant that belongs to a product owned by the authenticated seller.
 * Requests for variants not owned by the seller are rejected with 403 Forbidden.
 *
 * @param connection - API connection context with authentication
 * @param props.body - Optional partial inventory record data to customize (quantityChange, reason)
 * @param props.params.variantId - UUID of the product variant to update inventory for
 * @returns The newly created inventory record including quantity change and updated total stock
 */
export async function generate_random_ecommerce_mall_seller_variants_inventory_create(
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
    await api.functional.ecommerceMall.seller.variants.inventory.create(
      connection,
      {
        body: prepared,
        variantId: props.params.variantId,
      },
    );
  return result;
}
