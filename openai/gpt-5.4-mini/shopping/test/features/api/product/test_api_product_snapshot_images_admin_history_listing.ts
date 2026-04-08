import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

/**
 * Verify administrator access to preserved product snapshot image history.
 *
 * This test exercises the read-only historical gallery endpoint for a product snapshot.
 * It creates a seller-owned product, authenticates an administrator separately,
 * and then requests the preserved image rows for the snapshot history response to
 * validate pagination metadata, stable ordering, and repeated read consistency.
 *
 * The scenario focuses on 1. administrator authorization, 2. seller product setup,
 * 3. historical image listing, and 4. read-only behavior so the snapshot data can
 * be reviewed without mutating live product state.
 */
export async function test_api_product_snapshot_images_admin_history_listing(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(product);
  const request = {
    page: 1,
    limit: 10,
    order: "asc",
  } satisfies IMallPlatformProductSnapshotImage.IRequest;
  const firstPage =
    await api.functional.mallPlatform.administrator.products.snapshots.images.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: product.id,
        body: request,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.mallPlatform.administrator.products.snapshots.images.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: product.id,
        body: request,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", firstPage.pagination.limit, 10);
  TestValidator.equals(
    "repeated read pagination",
    firstPage.pagination,
    secondPage.pagination,
  );
  TestValidator.equals("repeated read data", firstPage.data, secondPage.data);
  TestValidator.predicate("image rows are ordered by sortOrder", () => {
    for (let i = 1; i < firstPage.data.length; ++i) {
      if (firstPage.data[i - 1].sortOrder > firstPage.data[i].sortOrder)
        return false;
    }
    return true;
  });
  TestValidator.predicate("image rows preserve read-only shape", () =>
    firstPage.data.every(
      (image) => image.createdAt.length > 0 && image.imageUri.length > 0,
    ),
  );
}
