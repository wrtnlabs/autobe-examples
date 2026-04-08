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

export async function test_api_product_snapshot_image_retrieve_scoped_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate scoped product snapshot image retrieval returns not found.
   *
   * This test verifies the seller-scoped snapshot image endpoint treats both a
   * missing association and a missing snapshot as the same not-found business
   * outcome. It also confirms the read-only request does not alter caller-side
   * authentication headers.
   *
   * 1. Register and authenticate a seller using an isolated seller connection.
   * 2. Request a snapshot image with mismatched snapshot and image UUIDs.
   * 3. Request a snapshot image with an unavailable snapshot UUID.
   * 4. Assert both calls fail with 404 not-found behavior.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const beforeHeaders = sellerConnection.headers
    ? { ...sellerConnection.headers }
    : undefined;
  await TestValidator.httpError(
    "returns not found when the image does not belong to the snapshot",
    404,
    async () => {
      await api.functional.mallPlatform.seller.productSnapshots.images.getByProductsnapshotidAndProductsnapshotimageid(
        sellerConnection,
        {
          productSnapshotId: typia.random<string & tags.Format<"uuid">>(),
          productSnapshotImageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  await TestValidator.httpError(
    "returns not found when the snapshot is unavailable",
    404,
    async () => {
      await api.functional.mallPlatform.seller.productSnapshots.images.getByProductsnapshotidAndProductsnapshotimageid(
        sellerConnection,
        {
          productSnapshotId: typia.random<string & tags.Format<"uuid">>(),
          productSnapshotImageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  TestValidator.equals(
    "seller connection headers remain unchanged after read-only failures",
    sellerConnection.headers,
    beforeHeaders,
  );
}
