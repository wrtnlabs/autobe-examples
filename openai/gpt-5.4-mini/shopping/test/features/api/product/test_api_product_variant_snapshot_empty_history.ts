import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_variant_snapshot_empty_history(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate the product variant snapshot history endpoint on an empty-history case.
   *
   * This test exercises the seller-only snapshot history API with a read-only request
   * and verifies that the returned payload conforms to the expected page structure.
   * It is intended to cover the no-history branch where the response should remain a
   * valid paginated collection even when no snapshot rows exist.
   *
   * 1. Register and authenticate a seller account through the seller join utility.
   * 2. Call the snapshot history endpoint with valid UUID path parameters and a
   *    default pagination request.
   * 3. Assert the response shape, pagination metadata, and that the history list is empty.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const snapshotPage =
    await api.functional.mallPlatform.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
          sort: "newest",
        } satisfies IMallPlatformProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  TestValidator.equals(
    "snapshot history data should be empty",
    snapshotPage.data,
    [],
  );
  TestValidator.equals(
    "pagination current page",
    snapshotPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshotPage.pagination.limit, 10);
  TestValidator.predicate(
    "pagination record count is non-negative",
    snapshotPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    snapshotPage.pagination.pages >= 0,
  );
}
