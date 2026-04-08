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

export async function test_api_product_snapshot_image_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieval of a preserved product snapshot image for an authenticated seller.
   *
   * Validates that the seller-only endpoint returns immutable historical image data
   * for the requested product snapshot image identifier pair, including the owning
   * snapshot reference, stored image URI, preserved sort order, and creation timestamp.
   *
   * 1. Authenticate a seller with isolated connection state.
   * 2. Request a product snapshot image by snapshot and image identifiers.
   * 3. Verify the response structure for the preserved snapshot image record.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const image =
    await api.functional.mallPlatform.seller.productSnapshots.images.getByProductsnapshotidAndProductsnapshotimageid(
      sellerConnection,
      {
        productSnapshotId: typia.random<string & tags.Format<"uuid">>(),
        productSnapshotImageId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(image);
  TestValidator.predicate(
    "snapshot image should include a preserved image URI",
    image.imageUri.length > 0,
  );
  TestValidator.predicate(
    "snapshot image should include a preserved sort order",
    Number.isInteger(image.sortOrder),
  );
  TestValidator.predicate(
    "snapshot image should include a creation timestamp",
    image.createdAt.length > 0,
  );
}
