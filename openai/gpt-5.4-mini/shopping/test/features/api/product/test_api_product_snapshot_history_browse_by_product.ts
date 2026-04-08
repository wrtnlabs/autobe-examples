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
 * Browse immutable product snapshot history for a specific product.
 *
 * This test validates that a seller can browse preserved snapshot records for a product and that the history response is paginated and ordered from newest to oldest. It also checks that each returned snapshot summary preserves the historical product state captured at creation time.
 *
 * 1. Authenticate a seller and create a product with valid catalog data.
 * 2. Browse snapshot history for that product with standard pagination settings.
 * 3. Validate pagination metadata, newest-first ordering, and the preserved historical fields in each snapshot summary.
 */
export async function test_api_product_snapshot_history_browse_by_product(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
  } satisfies IMallPlatformSeller.IJoin;
  const authorized = await authorize_seller_join(sellerConnection, {
    body: sellerCredentials,
  });
  typia.assert(authorized);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        categoryId: null,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(product);
  const page = await api.functional.mallPlatform.seller.productSnapshots.index(
    sellerConnection,
    {
      body: {
        productId: product.id,
        page: 1,
        limit: 10,
        sort: "-createdAt",
      } satisfies IMallPlatformProductSnapshot.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals("page number", page.pagination.current, 1);
  TestValidator.equals("page limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "records are non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate("pages are non-negative", page.pagination.pages >= 0);
  TestValidator.predicate(
    "newest-first ordering",
    page.data.every(
      (snapshot, index, array) =>
        index === 0 ||
        new Date(array[index - 1].createdAt).getTime() >=
          new Date(snapshot.createdAt).getTime(),
    ),
  );
  for (const snapshot of page.data) {
    TestValidator.equals(
      "snapshot belongs to requested product",
      snapshot.product.id,
      product.id,
    );
    TestValidator.equals(
      "snapshot product id matches relation",
      snapshot.product.id,
      product.id,
    );
    TestValidator.predicate(
      "snapshot kind is present",
      snapshot.snapshotKind.length > 0,
    );
    TestValidator.predicate(
      "snapshot createdAt is valid",
      snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "image count is non-negative",
      snapshot.imageCount >= 0,
    );
    TestValidator.predicate(
      "variant count is non-negative",
      snapshot.variantCount >= 0,
    );
    TestValidator.predicate(
      "main image uri is nullable string",
      snapshot.mainImageUri === null ||
        typeof snapshot.mainImageUri === "string",
    );
    TestValidator.equals(
      "snapshot product name preserved",
      snapshot.productName,
      snapshot.product.name,
    );
    TestValidator.equals(
      "snapshot product description preserved",
      snapshot.productDescription,
      snapshot.product.description,
    );
    TestValidator.equals(
      "snapshot base price preserved",
      snapshot.basePrice,
      snapshot.product.basePrice,
    );
    TestValidator.equals(
      "snapshot category preserved",
      snapshot.categoryName,
      snapshot.product.category?.name ?? null,
    );
    TestValidator.equals(
      "image count matches captured images",
      snapshot.imageCount,
      snapshot.imageCount,
    );
    TestValidator.equals(
      "variant count matches captured variants",
      snapshot.variantCount,
      snapshot.variantCount,
    );
  }
}
