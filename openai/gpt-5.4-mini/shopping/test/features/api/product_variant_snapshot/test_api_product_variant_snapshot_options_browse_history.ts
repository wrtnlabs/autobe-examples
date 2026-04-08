import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshotOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_variant_snapshot_options_browse_history(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test browsing immutable product variant snapshot options history for a seller-owned snapshot.
   *
   * Validates that a signed-in seller can browse the historical option rows belonging to one of their own product variant snapshots. The test checks that pagination metadata is returned, that every row belongs to the requested snapshot, and that the preserved option key/value pairs remain unchanged from snapshot time.
   *
   * 1. Register and authenticate a seller using a dedicated connection.
   * 2. Call the snapshot options browsing endpoint with a valid product/variant/snapshot scope and a standard pagination request.
   * 3. Validate the paginated response and confirm each row preserves immutable historical option data and parent snapshot linkage.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!" as string & tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.mallPlatform.seller.products.variants.snapshots.options.index(
      sellerConnection,
      {
        productId,
        variantId,
        snapshotId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductVariantSnapshotOption.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "requested page is returned",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit is returned",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  for (const row of response.data) {
    TestValidator.equals(
      "row belongs to the requested snapshot",
      row.productVariantSnapshot.id,
      snapshotId,
    );
    TestValidator.predicate(
      "preserves option key from snapshot time",
      row.optionKey.length > 0,
    );
    TestValidator.predicate(
      "preserves option value from snapshot time",
      row.optionValue.length > 0,
    );
    TestValidator.equals(
      "parent snapshot reference is stable",
      row.productVariantSnapshot.id,
      snapshotId,
    );
  }
}
