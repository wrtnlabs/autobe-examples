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
 * Generate a random product snapshot image via the API for E2E testing.
 *
 * Prepares valid immutable snapshot image data using the prepare function, then
 * creates the snapshot image rows for the specified product snapshot through the
 * seller API. This is intended for test scenarios that need historical product
 * image state persisted for audit and dispute-resolution workflows.
 *
 * The input body is a DeepPartial override for the snapshot image creation
 * payload, and the productSnapshotId path parameter identifies which snapshot
 * receives the immutable image rows.
 */
export async function generate_random_mall_platform_seller_product_snapshots_images_create(
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
  const result: IMallPlatformProductSnapshotImage =
    await api.functional.mallPlatform.seller.productSnapshots.images.create(
      connection,
      {
        body: prepared,
        productSnapshotId: props.params.productSnapshotId,
      },
    );
  return result;
}
