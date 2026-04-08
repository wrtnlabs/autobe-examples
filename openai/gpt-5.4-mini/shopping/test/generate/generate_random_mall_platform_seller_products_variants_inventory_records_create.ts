import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_inventory_record } from "../prepare/prepare_random_mall_platform_inventory_record";

/**
 * Generate a random inventory record for a product variant via the API for E2E testing.
 *
 * Prepares realistic inventory movement data using the prepare function, then calls the variant inventory record creation endpoint for the specified product and variant.
 *
 * The returned record is the created append-only inventory history entry, suitable for validating stock movement flows and audit history behavior.
 */
export async function generate_random_mall_platform_seller_products_variants_inventory_records_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformInventoryRecord.ICreate> | undefined;
    params: {
      productId: string;
      variantId: string;
    };
  },
): Promise<IMallPlatformInventoryRecord> {
  const prepared: IMallPlatformInventoryRecord.ICreate =
    prepare_random_mall_platform_inventory_record(props.body);
  return api.functional.mallPlatform.seller.products.variants.inventoryRecords.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
      variantId: props.params.variantId,
    },
  );
}
