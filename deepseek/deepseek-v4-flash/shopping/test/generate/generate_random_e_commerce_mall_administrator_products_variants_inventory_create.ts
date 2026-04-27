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
 * Generate a random inventory record for a product variant via the API for E2E testing.
 *
 * Prepares random inventory record data using the prepare function, then calls
 * the creation endpoint to adjust the stock quantity of the specified variant.
 * The prepared quantity_change defaults to a positive integer (restocking) with
 * a business-context reason, though both can be overridden via the optional body
 * parameter for test-specific scenarios such as negative adjustments or custom
 * reasons.
 *
 * The variant (referenced by variantId) must belong to the product (referenced
 * by productId), and the product must not be in 'suspended' or 'deleted'
 * visibility state.
 *
 * @param connection - The API connection configuration
 * @param props.body - Optional partial overrides for inventory record fields
 * @param props.params.productId - UUID of the parent product
 * @param props.params.variantId - UUID of the variant to adjust inventory for
 * @returns The created inventory record with full details
 */
export async function generate_random_e_commerce_mall_administrator_products_variants_inventory_create(
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
  return await api.functional.eCommerceMall.administrator.products.variants.inventory.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
      variantId: props.params.variantId,
    },
  );
}