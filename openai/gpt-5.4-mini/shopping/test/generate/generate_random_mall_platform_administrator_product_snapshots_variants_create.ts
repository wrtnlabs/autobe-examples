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
 * Generate a historical mall platform product snapshot variant via the API for E2E testing.
 *
 * Prepares random historical variant snapshot data using the prepare function,
 * then creates the snapshot variant record for the specified product snapshot.
 * This is intended for testing immutable snapshot history creation workflows.
 *
 * @param connection The API connection used to call the endpoint.
 * @param props The input body overrides and required product snapshot identifier.
 * @returns The created historical product snapshot variant record.
 */
export async function generate_random_mall_platform_administrator_product_snapshots_variants_create(
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
  return await api.functional.mallPlatform.administrator.productSnapshots.variants.create(
    connection,
    {
      body: prepared,
      productSnapshotId: props.params.productSnapshotId,
    },
  );
}
