import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_platform_inventory_record } from "../prepare/prepare_random_ecommerce_platform_inventory_record";

/**
 * Generate a random inventory ledger record for E2E testing.
 *
 * Creates an inventory adjustment entry for a product variant by preparing random
 * test data with quantity delta and reason, then calling the adjustments endpoint.
 * The record represents an immutable stock change event with positive deltas for
 * restocking/refund restorations or negative deltas for stock removals/loss adjustments.
 *
 * @param connection - API connection for making the request
 * @param props - Optional properties including body overrides and URL parameters
 * @returns The created inventory ledger record with the applied delta and timestamp
 */
export async function generate_random_ecommerce_platform_seller_products_variants_inventory_adjust(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformInventoryRecord.ICreate>;
    params?: {
      productId: string;
      variantId: string;
    };
  },
): Promise<IEcommercePlatformInventoryRecord> {
  const prepared: IEcommercePlatformInventoryRecord.ICreate =
    prepare_random_ecommerce_platform_inventory_record(props.body);
  const result: IEcommercePlatformInventoryRecord =
    await api.functional.ecommercePlatform.seller.products.variants.inventory.adjust(
      connection,
      {
        body: prepared,
        productId: props.params!.productId,
        variantId: props.params!.variantId,
      },
    );
  return result;
}
