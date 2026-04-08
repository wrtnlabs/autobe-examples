import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_inventory_record } from "../prepare/prepare_random_mall_platform_inventory_record";

/**
 * Generate a random inventory record for a product variant via the API for E2E testing.
 *
 * Prepares random inventory movement data using the prepare function, then calls the seller inventory-record creation endpoint for the specified product and variant.
 * This is useful for testing append-only inventory history behavior, including restock and adjustment flows.
 *
 * @param connection API connection to use for the request.
 * @param props Optional request body overrides and required route parameters.
 * @returns The created inventory record.
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
  return await api.functional.mallPlatform.seller.products.variants.inventoryRecords.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
      variantId: props.params.variantId,
    },
  );
}
