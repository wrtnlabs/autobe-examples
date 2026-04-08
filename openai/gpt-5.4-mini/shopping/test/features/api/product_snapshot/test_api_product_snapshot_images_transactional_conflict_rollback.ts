import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_product_snapshots_images_create } from "../../../generate/generate_random_mall_platform_seller_product_snapshots_images_create";
import { prepare_random_mall_platform_product_snapshot_image } from "../../../prepare/prepare_random_mall_platform_product_snapshot_image";

export async function test_api_product_snapshot_images_transactional_conflict_rollback(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies immutable snapshot image creation behavior for product snapshots.
   *
   * This scenario focuses on the historical snapshot-image endpoint and validates
   * that a seller can create immutable product snapshot image rows while a second
   * request using the same snapshot and duplicate ordering is rejected rather than
   * mutating active product images.
   *
   * 1. Register a seller and use an actor-specific authorized connection.
   * 2. Create one immutable snapshot image row for a synthetic snapshot id.
   * 3. Attempt a conflicting duplicate-order creation and verify the request is
   *    rejected without affecting the already created immutable row.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16) satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const productSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const firstBody = {
    imageUri:
      `../images/${RandomGenerator.alphaNumeric(12)}.jpg` satisfies string &
        tags.Format<"uri-reference">,
    sortOrder: 0,
  } satisfies IMallPlatformProductSnapshotImage.ICreate;
  const firstImage =
    await generate_random_mall_platform_seller_product_snapshots_images_create(
      sellerConnection,
      {
        params: { productSnapshotId },
        body: firstBody,
      },
    );
  typia.assert(firstImage);
  TestValidator.equals(
    "snapshot image preserves requested sort order",
    firstImage.sortOrder,
    firstBody.sortOrder,
  );
  TestValidator.equals(
    "snapshot image preserves requested uri",
    firstImage.imageUri,
    firstBody.imageUri,
  );
  TestValidator.equals(
    "snapshot image belongs to the requested snapshot",
    firstImage.productSnapshot.id,
    productSnapshotId,
  );
  const duplicateBody = {
    imageUri:
      `../images/${RandomGenerator.alphaNumeric(12)}-dup.jpg` satisfies string &
        tags.Format<"uri-reference">,
    sortOrder: 0,
  } satisfies IMallPlatformProductSnapshotImage.ICreate;
  await TestValidator.httpError(
    "duplicate snapshot image sort order should be rejected",
    [400, 409, 422],
    async () => {
      await api.functional.mallPlatform.seller.productSnapshots.images.create(
        sellerConnection,
        {
          productSnapshotId,
          body: duplicateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "existing snapshot image remains unchanged after rejected duplicate",
    firstImage.imageUri,
    firstBody.imageUri,
  );
  TestValidator.equals(
    "existing snapshot image sort order remains unchanged after rejected duplicate",
    firstImage.sortOrder,
    firstBody.sortOrder,
  );
}
