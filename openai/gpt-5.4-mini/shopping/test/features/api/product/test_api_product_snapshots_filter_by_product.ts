import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshots_filter_by_product(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate administrator-filtered product snapshot browsing by product identifier.
   *
   * This test verifies the immutable snapshot history list endpoint for product-scoped filtering. It ensures an administrator can browse only snapshots belonging to one product, that the response remains paginated, and that each returned record preserves the historical product state for dispute review.
   *
   * 1. Register and authenticate an administrator using an isolated connection.
   * 2. Query the product snapshot history with a target product identifier and a small page size.
   * 3. Validate the response shape, pagination metadata, and per-record product scoping.
   * 4. Query again with a non-matching product identifier and confirm an empty page is returned.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `P@ssw0rd_${RandomGenerator.alphabets(8)}`,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const targetProductId = typia.random<string & tags.Format<"uuid">>();
  const otherProductId = typia.random<string & tags.Format<"uuid">>();
  const firstPage =
    await api.functional.mallPlatform.administrator.productSnapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "-createdAt",
          productId: targetProductId,
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "product snapshot response is paginated",
    firstPage.pagination.current >= 1 &&
      firstPage.pagination.limit >= 1 &&
      firstPage.pagination.records >= 0 &&
      firstPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "product snapshot filter should preserve requested page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "product snapshot filter should preserve requested limit",
    firstPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "all returned snapshots should belong to the requested product",
    firstPage.data.every((snapshot) => snapshot.product.id === targetProductId),
  );
  TestValidator.predicate(
    "snapshot summaries preserve historical product state",
    firstPage.data.every(
      (snapshot) =>
        snapshot.productName.length > 0 &&
        snapshot.productDescription.length > 0 &&
        snapshot.basePrice >= 0 &&
        snapshot.imageCount >= 0 &&
        snapshot.variantCount >= 0 &&
        snapshot.createdAt.length > 0,
    ),
  );
  const emptyPage =
    await api.functional.mallPlatform.administrator.productSnapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "-createdAt",
          productId: otherProductId,
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "no-match product snapshot query should return zero records",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "no-match product snapshot query should return an empty data page",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "no-match product snapshot query should return zero pages",
    emptyPage.pagination.pages,
    0,
  );
}
