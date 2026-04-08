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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_snapshot_images_access_restriction(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies access restriction behavior for preserved product snapshot images.
   *
   * This test focuses on the platform rule that immutable product snapshot image
   * history must not be readable through an invalid snapshot identifier, and that
   * failed lookup attempts do not mutate the preserved image listing itself.
   *
   * 1. Authenticate a seller-scoped connection for authorized API access.
   * 2. Request snapshot images with a clearly non-existent snapshot id.
   * 3. Confirm the API rejects the request and does not alter the immutable
   *    snapshot image history response shape.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const missingSnapshotId = "00000000-0000-0000-0000-000000000000" as const;
  const request = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformProductSnapshotImage.IRequest;
  await TestValidator.httpError(
    "should reject a missing product snapshot id",
    [404, 403],
    async () => {
      await api.functional.mallPlatform.seller.productSnapshots.images.index(
        sellerConnection,
        {
          productSnapshotId: missingSnapshotId,
          body: request,
        },
      );
    },
  );
  const afterFailure =
    await api.functional.mallPlatform.seller.productSnapshots.images.index(
      sellerConnection,
      {
        productSnapshotId: missingSnapshotId,
        body: request,
      },
    );
  typia.assert(afterFailure);
  TestValidator.equals(
    "failed lookup should preserve pagination record count",
    afterFailure.pagination.records,
    afterFailure.data.length,
  );
}
