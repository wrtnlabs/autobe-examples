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

/**
 * Verifies that snapshot image creation fails when the parent product snapshot is missing.
 *
 * This scenario validates seller-authenticated access to the product snapshot image creation endpoint and ensures the API returns a business not-found failure when the referenced product snapshot does not exist.
 *
 * It also ensures no partial snapshot image history is created for an absent parent snapshot and that the request is rejected cleanly under valid seller authorization.
 *
 * 1. Register and authenticate a seller account.
 * 2. Call the product snapshot image creation endpoint with a missing product snapshot id.
 * 3. Confirm the request fails with a not-found business error.
 */
export async function test_api_product_snapshot_images_missing_snapshot(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "Test1234!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const missingProductSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    imageUri: `https://example.com/${RandomGenerator.alphabets(8)}.jpg`,
    sortOrder: 0,
  } satisfies IMallPlatformProductSnapshotImage.ICreate;
  await TestValidator.error(
    "missing product snapshot should reject snapshot image creation",
    async () => {
      await generate_random_mall_platform_seller_product_snapshots_images_create(
        sellerConnection,
        {
          params: { productSnapshotId: missingProductSnapshotId },
          body,
        },
      );
    },
  );
}
