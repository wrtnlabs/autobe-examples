import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_product_snapshot_image } from "../prepare/prepare_random_mall_platform_product_snapshot_image";

/**
 * Generate a random product snapshot image through the API for E2E testing.
 *
 * Prepares immutable snapshot image row data using the prepare function, then
 * creates the snapshot image record for the specified product snapshot via the
 * administrator API. This is used to build historical product image state for
 * audit and dispute-resolution scenarios.
 */
export async function generate_random_mall_platform_administrator_product_snapshots_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformProductSnapshotImage.ICreate> | undefined;
    params: {
      productSnapshotId: string;
    };
  },
): Promise<IMallPlatformProductSnapshotImage> {
  const prepared: IMallPlatformProductSnapshotImage.ICreate =
    prepare_random_mall_platform_product_snapshot_image(props.body);
  return await api.functional.mallPlatform.administrator.productSnapshots.images.create(
    connection,
    {
      body: prepared,
      productSnapshotId: props.params.productSnapshotId,
    },
  );
}
