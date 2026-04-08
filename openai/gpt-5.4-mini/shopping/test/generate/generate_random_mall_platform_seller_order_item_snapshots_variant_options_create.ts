import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_order_item_snapshot_variant_option } from "../prepare/prepare_random_mall_platform_order_item_snapshot_variant_option";

/**
 * Generate a random order item snapshot variant option via the API for E2E testing.
 *
 * Prepares normalized option data using the prepare function, then creates the preserved snapshot option row through the seller API.
 *
 * The parent order item snapshot is identified by orderItemSnapshotId. This function is intended for tests that need a real persisted variant option attached to an existing order item snapshot.
 */
export async function generate_random_mall_platform_seller_order_item_snapshots_variant_options_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IMallPlatformOrderItemSnapshotVariantOption.ICreate>
      | undefined;
    params: {
      orderItemSnapshotId: string;
    };
  },
): Promise<IMallPlatformOrderItemSnapshotVariantOption> {
  const prepared: IMallPlatformOrderItemSnapshotVariantOption.ICreate =
    prepare_random_mall_platform_order_item_snapshot_variant_option(props.body);
  return await api.functional.mallPlatform.seller.orderItemSnapshots.variantOptions.create(
    connection,
    {
      body: prepared,
      orderItemSnapshotId: props.params.orderItemSnapshotId,
    },
  );
}
