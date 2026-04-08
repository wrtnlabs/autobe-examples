import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_inventory_record } from "../prepare/prepare_random_ecommerce_inventory_record";

/**
 * Generate a random inventory record for a product variant via the API for E2E testing.
 *
 * Creates an inventory change record that documents a stock quantity adjustment for the specified variant. This is used to test manual seller-initiated inventory changes including restocking, adjustments, and losses.
 *
 * The preparation function generates random quantity_change values (positive for additions, negative for deductions) and realistic business reasons from common inventory operation types. The variantId parameter must reference an existing product variant owned by the authenticated seller.
 *
 * @param connection The API connection object with authentication
 * @param props.body Optional partial input to override specific fields in the inventory record
 * @param props.params.variantId The UUID of the product variant to create the inventory record for
 * @returns The created inventory record with all fields including id, timestamps, and variant reference
 */
export async function generate_random_ecommerce_seller_variants_inventory_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceInventoryRecord.ICreate>;
    params: {
      variantId: string;
    };
  },
): Promise<IEcommerceInventoryRecord> {
  const prepared: IEcommerceInventoryRecord.ICreate =
    prepare_random_ecommerce_inventory_record(props.body);
  const result: IEcommerceInventoryRecord =
    await api.functional.ecommerce.seller.variants.inventory.create(
      connection,
      {
        variantId: props.params.variantId,
        body: prepared,
      },
    );
  return result;
}
