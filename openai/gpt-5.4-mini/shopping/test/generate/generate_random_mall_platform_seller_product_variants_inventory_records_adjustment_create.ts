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

export async function generate_random_mall_platform_seller_product_variants_inventory_records_adjustment_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformInventoryRecord.ICreate> | undefined;
    params: {
      productVariantId: string;
    };
  },
): Promise<IMallPlatformInventoryRecord> {
  const prepared: IMallPlatformInventoryRecord.ICreate =
    prepare_random_mall_platform_inventory_record(props.body);
  return await api.functional.mallPlatform.seller.productVariants.inventoryRecords.adjustment.create(
    connection,
    {
      body: prepared,
      productVariantId: props.params.productVariantId,
    },
  );
}
