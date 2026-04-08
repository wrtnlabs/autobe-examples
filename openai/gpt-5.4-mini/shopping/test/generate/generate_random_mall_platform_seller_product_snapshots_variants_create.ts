import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_product_snapshot_variant } from "../prepare/prepare_random_mall_platform_product_snapshot_variant";

/**
 * Generate a random mall platform product snapshot variant via the API for E2E testing.
 *
 * Prepares historical product snapshot variant data using the prepare function, then calls the seller snapshot variant creation endpoint for the specified product snapshot.
 *
 * This function is intended for E2E scenarios that need a persisted preserved SKU-level snapshot row. It always delegates input construction to the prepare helper and returns the created historical record from the API.
 */
export async function generate_random_mall_platform_seller_product_snapshots_variants_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformProductSnapshotVariant.ICreate> | undefined;
    params: {
      productSnapshotId: string;
    };
  },
): Promise<IMallPlatformProductSnapshotVariant> {
  const prepared: IMallPlatformProductSnapshotVariant.ICreate =
    prepare_random_mall_platform_product_snapshot_variant(props.body);
  return await api.functional.mallPlatform.seller.productSnapshots.variants.create(
    connection,
    {
      body: prepared,
      productSnapshotId: props.params.productSnapshotId,
    },
  );
}
