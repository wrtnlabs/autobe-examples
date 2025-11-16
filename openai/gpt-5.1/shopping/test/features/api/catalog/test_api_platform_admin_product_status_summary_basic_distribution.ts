import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCatalogStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogStatistics";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate aggregated product status distribution for platform admin.
 *
 * Business goal: Ensure that GET
 * /shoppingMall/platformAdmin/catalog/statistics/productStatusSummary returns a
 * coherent aggregated distribution of products by status that reflects
 * underlying catalog data created within this test, and that totalCount matches
 * the sum of bucket product counts.
 *
 * Scenario outline:
 *
 * 1. Register a platform admin and a seller.
 * 2. As platform admin, create a category tree and a brand as realistic catalog
 *    prerequisites.
 * 3. Create several products with specific statuses from both platformAdmin and
 *    seller contexts.
 * 4. As platform admin, request the product status summary statistics.
 * 5. Validate that buckets cover the statuses used in this test and that
 *    productCount per status is at least the number of products created for
 *    that status, and totalCount equals the sum of bucket counts.
 */
export async function test_api_platform_admin_product_status_summary_basic_distribution(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) to obtain an authorized admin session.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminJoinResult: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinResult);

  // Optionally re-login as platform admin to exercise login endpoint and
  // ensure token handling does not break subsequent calls.
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoginResult: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 2. As platform admin, create a category tree.
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 3. As platform admin, create a brand to associate with products.
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri:
      "https://cdn.shoppingmall.test/logos/" + RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Register a seller and obtain seller session.
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerJoinResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoinResult);

  // Explicitly login as seller as well (even though join returns a session),
  // to exercise the login flow.
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginResult);

  // 5. Prepare expected status counts.
  const statusActive = "active";
  const statusDraft = "draft";
  const statusInactive = "inactive";

  let expectedActiveCount = 0;
  let expectedDraftCount = 0;
  let expectedInactiveCount = 0;

  // 6. Create products as platform admin, owned by the seller.
  // NOTE: For platformAdmin.products.create we explicitly set the seller
  // context via shopping_mall_seller_id = sellerJoinResult.id.
  const adminSellerId = sellerJoinResult.id;

  const createAdminProduct = async (
    codeSuffix: string,
    status: string,
  ): Promise<IShoppingMallProduct> => {
    const body = {
      shopping_mall_seller_id: adminSellerId,
      shopping_mall_brand_id: brand.id,
      code: `adm-${codeSuffix}-${RandomGenerator.alphaNumeric(6)}`,
      name: `Admin Product ${RandomGenerator.name(1)}`,
      short_description: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      status,
      is_multi_sku: false,
      primary_image_uri:
        "https://cdn.shoppingmall.test/products/" +
        RandomGenerator.alphaNumeric(12),
      additional_data: null,
    } satisfies IShoppingMallProduct.ICreate;

    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.platformAdmin.products.create(
        connection,
        { body },
      );
    typia.assert(product);
    return product;
  };

  // Create 2 active, 1 draft, 1 inactive admin-owned products.
  await createAdminProduct("active-1", statusActive);
  expectedActiveCount += 1;

  await createAdminProduct("active-2", statusActive);
  expectedActiveCount += 1;

  await createAdminProduct("draft-1", statusDraft);
  expectedDraftCount += 1;

  await createAdminProduct("inactive-1", statusInactive);
  expectedInactiveCount += 1;

  // 7. Create additional products as seller via seller/products.create.
  const createSellerProduct = async (
    codeSuffix: string,
    status: string,
  ): Promise<IShoppingMallProduct> => {
    const body = {
      shopping_mall_seller_id: sellerLoginResult.id,
      shopping_mall_brand_id: brand.id,
      code: `sel-${codeSuffix}-${RandomGenerator.alphaNumeric(6)}`,
      name: `Seller Product ${RandomGenerator.name(1)}`,
      short_description: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      status,
      is_multi_sku: false,
      primary_image_uri:
        "https://cdn.shoppingmall.test/products/" +
        RandomGenerator.alphaNumeric(12),
      additional_data: null,
    } satisfies IShoppingMallProduct.ICreate;

    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.seller.products.create(connection, {
        body,
      });
    typia.assert(product);
    return product;
  };

  // 1 extra active and 1 extra draft seller-owned products.
  await createSellerProduct("active-seller", statusActive);
  expectedActiveCount += 1;

  await createSellerProduct("draft-seller", statusDraft);
  expectedDraftCount += 1;

  // 8. Switch back to platform admin context for statistics
  const adminReloginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.test/dashboard",
    referrer: "https://admin.shoppingmall.test/login",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminReloginResult: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminReloginBody,
    });
  typia.assert(adminReloginResult);

  // 9. Invoke the product status summary statistics endpoint.
  const summary: IShoppingMallCatalogStatistics.IProductStatusSummary =
    await api.functional.shoppingMall.platformAdmin.catalog.statistics.productStatusSummary.index(
      connection,
    );
  typia.assert(summary);

  // Basic structural validations.
  TestValidator.predicate(
    "productStatusSummary.buckets is non-empty array",
    Array.isArray(summary.buckets) && summary.buckets.length > 0,
  );

  TestValidator.predicate(
    "productStatusSummary.totalCount is non-negative",
    summary.totalCount >= 0,
  );

  // Verify that totalCount equals the sum of bucket.productCount.
  const sumOfBuckets = summary.buckets.reduce((acc, bucket) => {
    return acc + bucket.productCount;
  }, 0);

  TestValidator.equals(
    "totalCount equals sum of all bucket.productCount",
    summary.totalCount,
    sumOfBuckets,
  );

  // Helper to find bucket by status
  const findBucket = (
    status: string,
  ): IShoppingMallCatalogStatistics.IProductStatusBucket | undefined =>
    summary.buckets.find((b) => b.status === status);

  // Assert that a bucket exists for each status we used and that its
  // productCount is at least as large as the number of products created
  // in this test for that status.

  const activeBucket = findBucket(statusActive);
  TestValidator.predicate(
    "bucket exists for status 'active'",
    activeBucket !== undefined,
  );
  if (activeBucket !== undefined) {
    TestValidator.predicate(
      "active bucket productCount >= created active products",
      activeBucket.productCount >= expectedActiveCount,
    );
  }

  const draftBucket = findBucket(statusDraft);
  TestValidator.predicate(
    "bucket exists for status 'draft'",
    draftBucket !== undefined,
  );
  if (draftBucket !== undefined) {
    TestValidator.predicate(
      "draft bucket productCount >= created draft products",
      draftBucket.productCount >= expectedDraftCount,
    );
  }

  const inactiveBucket = findBucket(statusInactive);
  TestValidator.predicate(
    "bucket exists for status 'inactive'",
    inactiveBucket !== undefined,
  );
  if (inactiveBucket !== undefined) {
    TestValidator.predicate(
      "inactive bucket productCount >= created inactive products",
      inactiveBucket.productCount >= expectedInactiveCount,
    );
  }
}
