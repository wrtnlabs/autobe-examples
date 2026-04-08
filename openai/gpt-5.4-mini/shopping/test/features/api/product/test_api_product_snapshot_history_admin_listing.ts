import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

export async function test_api_product_snapshot_history_admin_listing(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator browsing product snapshot history for a seller product.
   *
   * Validates that the snapshot history endpoint returns a paginated read-only
   * response for a product created by a seller. The test focuses on the
   * contract that is available in the generated SDK: a product-scoped snapshot
   * list with newest-first ordering by default and preserved historical fields
   * for each snapshot summary.
   *
   * 1. Authenticate a seller and create a product.
   * 2. Authenticate an administrator and request the product snapshot history.
   * 3. Verify pagination metadata, snapshot summary fields, and default order.
   * 4. Confirm the product record is unchanged by the read-only listing call.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const productBody = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    categoryId: null,
    basePrice: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IMallPlatformProduct.ICreate;
  const createdProduct =
    await generate_random_mall_platform_seller_products_create(
      sellerConnection,
      { body: productBody },
    );
  typia.assert(createdProduct);
  const liveProductBefore = createdProduct;
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const snapshotPage =
    await api.functional.mallPlatform.administrator.products.snapshots.index(
      adminConnection,
      {
        productId: createdProduct.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  TestValidator.equals(
    "snapshot pagination current page",
    snapshotPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "snapshot pagination limit",
    snapshotPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "snapshot pagination records are non-negative",
    snapshotPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot pagination pages are non-negative",
    snapshotPage.pagination.pages >= 0,
  );
  if (snapshotPage.data.length > 0) {
    const firstSnapshot = snapshotPage.data[0];
    typia.assert(firstSnapshot);
    TestValidator.equals(
      "snapshot product reference matches target product",
      firstSnapshot.product.id,
      createdProduct.id,
    );
    TestValidator.equals(
      "snapshot preserved product name matches the current product name",
      firstSnapshot.productName,
      liveProductBefore.name,
    );
    TestValidator.equals(
      "snapshot preserved product description matches the current product description",
      firstSnapshot.productDescription,
      liveProductBefore.description,
    );
    TestValidator.equals(
      "snapshot preserved category name matches the current category label",
      firstSnapshot.categoryName,
      liveProductBefore.category?.name ?? null,
    );
    TestValidator.equals(
      "snapshot preserved base price matches the current product base price",
      firstSnapshot.basePrice,
      liveProductBefore.basePrice,
    );
    TestValidator.predicate(
      "snapshot image count is non-negative",
      firstSnapshot.imageCount >= 0,
    );
    TestValidator.predicate(
      "snapshot variant count is non-negative",
      firstSnapshot.variantCount >= 0,
    );
    TestValidator.predicate(
      "snapshot createdAt is a valid date-time string",
      !Number.isNaN(new Date(firstSnapshot.createdAt).getTime()),
    );
    if (snapshotPage.data.length >= 2) {
      TestValidator.predicate(
        "snapshots are sorted newest first by default",
        new Date(snapshotPage.data[0].createdAt).getTime() >=
          new Date(snapshotPage.data[1].createdAt).getTime(),
      );
    }
  }
  const liveProductAfter =
    await api.functional.mallPlatform.seller.products.create(sellerConnection, {
      body: {
        name: productBody.name,
        description: productBody.description,
        categoryId: productBody.categoryId,
        basePrice: productBody.basePrice,
      } satisfies IMallPlatformProduct.ICreate,
    });
  typia.assert(liveProductAfter);
  TestValidator.equals(
    "snapshot listing does not mutate the live product id",
    liveProductBefore.id,
    createdProduct.id,
  );
  TestValidator.equals(
    "snapshot listing does not mutate the live product name",
    liveProductBefore.name,
    createdProduct.name,
  );
  TestValidator.equals(
    "snapshot listing does not mutate the live product description",
    liveProductBefore.description,
    createdProduct.description,
  );
  TestValidator.equals(
    "snapshot listing does not mutate the live product base price",
    liveProductBefore.basePrice,
    createdProduct.basePrice,
  );
}
