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
 * Creates an inventory record to modify the stock quantity of a product variant.
 * This endpoint allows sellers to add inventory (restock) or subtract inventory
 * (adjustment) for their product variants. Each operation creates an immutable
 * inventory record that captures the quantity change and reason, maintaining a
 * complete audit trail of all stock modifications.
 *
 * The variantId must reference an existing variant owned by the authenticated seller.
 * Valid reasons include 'restock', 'adjustment', 'damaged', 'expired', 'correction',
 * 'return', and 'transfer'.
 *
 * @param connection - API connection configuration
 * @param props.body - Optional customization for the inventory record data
 * @param props.params.variantId - UUID of the product variant to modify
 * @returns The created inventory record with id, quantityChange, reason, and timestamp
 */
export async function generate_random_ecommerce_mall_seller_variants_inventory_restock(
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
    await api.functional.ecommerceMall.seller.variants.inventory.restock(
      connection,
      {
        variantId: props.params.variantId,
        body: prepared,
      },
    );
  return result;
}
