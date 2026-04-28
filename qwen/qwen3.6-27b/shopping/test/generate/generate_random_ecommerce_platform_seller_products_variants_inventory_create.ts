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
 * Generate a random inventory record for a product variant via the API for E2E testing.
 *
 * Prepares random inventory data using the prepare function (quantity delta and reason),
 * then creates an immutable ledger entry attached to the specified product variant. This operation
 * records stock changes forming an audit trail for inventory management. Positive quantity deltas
 * represent stock additions (restocking, cancellations, refunds), while negative values represent
 * stock removals (order fulfillment, loss adjustments).
 *
 * Requires valid productId and variantId as URL parameters identifying the target product variant
 * for which the inventory adjustment is being recorded.
 */
export async function generate_random_ecommerce_platform_seller_products_variants_inventory_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformInventoryRecord.ICreate> | undefined;
    params: {
      productId: string;
      variantId: string;
    };
  },
): Promise<IEcommercePlatformInventoryRecord> {
  const prepared: IEcommercePlatformInventoryRecord.ICreate =
    prepare_random_ecommerce_platform_inventory_record(props.body);
  return await api.functional.ecommercePlatform.seller.products.variants.inventory.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
      variantId: props.params.variantId,
    },
  );
}
