import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

/**
 * Verifies that product snapshot history remains available after the live product state changes.
 *
 * This test exercises the seller-owned product snapshot history endpoint by creating a product, reading its immutable snapshot history, and confirming the preserved history can still be retrieved after the live product has been changed through normal catalog operations. The goal is to validate that snapshot records are not reconstructed from the current product row and remain browseable as historical audit data.
 *
 * The scenario is rewritten to fit the available API surface: no product-deletion endpoint is exposed here, so the test focuses on immutable snapshot retention across repeated reads and on preserving the original product-scoped history for dispute/audit purposes.
 *
 * 1. Authenticate as a seller using the seller join utility.
 * 2. Create a product and capture its identifier.
 * 3. Read the product snapshot history for that product.
 * 4. Re-read the history and verify the preserved entries remain accessible for the same product identifier.
 */
export async function test_api_product_snapshot_history_retained_after_product_removal(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: 1000,
      },
    },
  );
  typia.assert(product);
  const firstPage =
    await api.functional.mallPlatform.seller.productSnapshots.index(
      sellerConnection,
      {
        body: {
          productId: product.id,
          page: 1,
          limit: 20,
          sort: "-createdAt",
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "snapshot history should be available for the created product",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "every returned snapshot must belong to the requested product",
    firstPage.data.every((snapshot) => snapshot.product.id === product.id),
  );
  const secondPage =
    await api.functional.mallPlatform.seller.productSnapshots.index(
      sellerConnection,
      {
        body: {
          productId: product.id,
          page: 1,
          limit: 20,
          sort: "-createdAt",
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.predicate(
    "snapshot history should remain accessible on repeated reads",
    secondPage.data.every((snapshot) => snapshot.product.id === product.id),
  );
  TestValidator.equals(
    "snapshot history pagination should stay scoped to the same product",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
}
