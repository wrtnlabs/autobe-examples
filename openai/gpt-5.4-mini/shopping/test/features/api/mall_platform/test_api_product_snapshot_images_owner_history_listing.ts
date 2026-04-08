import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
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

export async function test_api_product_snapshot_images_owner_history_listing(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that the owning seller can retrieve preserved image-state rows for one of their own product snapshots.
   *
   * This test authenticates a seller and exercises the seller-scoped snapshot image history endpoint using a pair of UUID identifiers. It validates the response as a paginated immutable history list and checks that the returned rows preserve their stored image URI and sort order fields.
   *
   * 1. Register and authenticate a seller connection for owner-scoped access.
   * 2. Request the snapshot image history for a product and snapshot identifier pair.
   * 3. Validate the pagination envelope and the historical image row structure.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const response =
    await api.functional.mallPlatform.seller.products.snapshots.images.index(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
          order: "asc",
        } satisfies IMallPlatformProductSnapshotImage.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals(
    "pagination records match returned rows",
    response.pagination.records,
    response.data.length,
  );
  TestValidator.equals(
    "pagination pages match returned row count",
    response.pagination.pages,
    response.data.length === 0 ? 0 : 1,
  );
  TestValidator.predicate(
    "snapshot image rows expose preserved image URIs",
    response.data.every((item) => item.imageUri.length > 0),
  );
  TestValidator.predicate(
    "snapshot image rows expose preserved sort order values",
    response.data.every((item) => Number.isInteger(item.sortOrder)),
  );
  TestValidator.predicate(
    "snapshot image rows are linked to a product snapshot",
    response.data.every((item) => item.productSnapshot.id.length > 0),
  );
}
